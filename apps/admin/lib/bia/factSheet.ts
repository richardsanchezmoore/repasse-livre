import type { AnuncioBia, FactSheet, FichaCategoria, PontoPreco } from "./tipos";
import { INDICADORES, type CtxIndicador, type Numeros } from "./indicadores";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Escolhe estrelas por faixa crescente: pega o maior limiar que `valor` alcança. */
function porFaixa(valor: number, faixas: [limiar: number, estrelas: number][]): number {
  let e = 1;
  for (const [lim, est] of faixas) if (valor >= lim) e = est;
  return e;
}

/**
 * BIA Engine — computa o fact-sheet de um anúncio a partir do UNIVERSO atual
 * (anúncios ativos com o mesmo fipe_codigo) e do histórico de preço dele. Roda
 * todos os indicadores; cada um só produz evidência se o gate de amostra bater.
 * Chamado na LEITURA (a parte relativa à coorte muda com o mercado). Determinístico
 * — o LLM (fase futura) só reescreve `copiloto` a partir de `evidencias`.
 */
export function computarFactSheet(anuncio: AnuncioBia, universo: AnuncioBia[], precoLog: PontoPreco[]): FactSheet {
  const ctx: CtxIndicador = { anuncio, universo, precoLog };

  const evidencias: FactSheet["evidencias"] = [];
  let nums: Numeros = {};
  for (const indicador of INDICADORES) {
    const r = indicador(ctx);
    if (r.evidencia) evidencias.push(r.evidencia);
    if (r.numeros) nums = { ...nums, ...r.numeros };
  }

  const dias = Number.isFinite(Date.parse(anuncio.data_captura))
    ? Math.max(0, Math.floor((Date.now() - Date.parse(anuncio.data_captura)) / 86400000))
    : 0;

  const positivos = evidencias.filter((e) => e.tipo === "positivo");
  const ehLeilao = evidencias.some((e) => e.tipo === "alerta" && e.chave === "leilao");
  const fichas = montarFichas(anuncio, nums);

  // ---- score = média PONDERADA das avaliações (os PILARES pesam mais) ----
  const score = scoreDasFichas(fichas, ehLeilao);
  const classificacao = classificar(score, ehLeilao);

  // Cobertura de dado (interno/Premium; não exibido ao comprador comum).
  const cobertura = Math.min(1, evidencias.length / 6);
  const amostra = Math.min(1, (nums.coorteTamanho ?? 0) / 50);
  const grau_confianca = Math.round(100 * (0.55 * cobertura + 0.45 * amostra));

  return {
    opportunity_id: anuncio.id,
    calculado_em: new Date().toISOString(),
    score,
    grau_confianca,
    percentual_fipe: nums.percentual_fipe ?? anuncio.margem_percentual ?? null,
    percentual_mercado: nums.percentual_mercado ?? null,
    percentil_desconto: nums.percentil_desconto ?? null,
    km_percentil: nums.km_percentil ?? null,
    indice_exclusividade: nums.indice_exclusividade ?? null,
    dias_monitorado: dias,
    historico_reducoes: nums.historico_reducoes ?? 0,
    coorte: nums.coorteEscopo ? { rotulo: nums.coorteEscopo, tamanho: nums.coorteTamanho ?? 0 } : null,
    classificacao,
    copiloto: montarParecer(classificacao, nums),
    destaques: positivos.map((e) => e.texto),
    fichas,
    evidencias,
  };
}

// Peso de cada avaliação no score. Pilares do mercado de oportunidade (definidos
// pelo usuário, 17 anos de expertise): MARGEM > KM > procedência. "Nível de
// Informações" não é fator de VALOR → peso 0 (só é exibido).
const PESO_CATEGORIA: Record<string, number> = {
  "Preço vs FIPE": 0.35, // margem vs. tabela (referência)
  Quilometragem: 0.3, // dado duro, escala de mercado do usuário — pilar forte
  "Preço vs. mercado": 0.25, // vs. concorrentes reais (ranking/distância da média fundidos)
  Procedência: 0.1,
};

function scoreDasFichas(fichas: FichaCategoria[], ehLeilao: boolean): number | null {
  let somaPeso = 0;
  let somaPond = 0;
  for (const f of fichas) {
    const p = PESO_CATEGORIA[f.categoria] ?? 0;
    if (p > 0 && f.estrelas != null) {
      somaPeso += p;
      somaPond += f.estrelas * p;
    }
  }
  if (somaPeso === 0) return null;
  let s = Math.round((somaPond / somaPeso / 5) * 100);
  if (ehLeilao) s = Math.min(s, 45); // leilão nunca é bom negócio
  return s;
}

/** Veredito humano. Bandas calibradas pelo usuário: Boa ≥ 70. Leilão nunca é bom. */
function classificar(score: number | null, ehLeilao: boolean): string {
  if (score == null) return "Sem dados suficientes";
  if (ehLeilao) return score >= 40 ? "Oportunidade com ressalva" : "Requer atenção";
  if (score >= 82) return "Excelente oportunidade";
  if (score >= 70) return "Boa oportunidade";
  if (score >= 50) return "Oportunidade razoável";
  return "Preço na média do mercado";
}

/** Estrelas de MARGEM (% abaixo da FIPE) — escala de mercado do usuário, meia-estrela. */
function estrelasMargem(m: number | null): number | null {
  if (m == null || m < 3) return null;
  if (m >= 20) return 5;
  if (m >= 17.5) return 4.5;
  if (m >= 15) return 4;
  if (m >= 12.5) return 3.5;
  if (m >= 10) return 3;
  if (m >= 7.5) return 2.5;
  if (m >= 5) return 2;
  return 1; // 3–5%
}

/** Estrelas de KM — ABSOLUTO (expertise do usuário), não percentil. Meia-estrela. */
function estrelasKm(km: number | null): number | null {
  // Guard de plausibilidade: km < 1000 num usado é dado sujo (0 = não preenchido,
  // ou vendedor digitou "105" = 105 mil). Não avalia — não inventa 5★ pra km falso.
  if (km == null || km < 1000) return null;
  if (km <= 30000) return 5;
  if (km <= 50000) return 4.5;
  if (km <= 75000) return 4;
  if (km <= 100000) return 3.5;
  if (km <= 125000) return 3;
  if (km <= 150000) return 2;
  if (km <= 200000) return 1;
  return 0.5;
}

/**
 * Fichário de AVALIAÇÕES (as estrelas que o comprador entende). Só entram
 * categorias COM dado — nada de "N/D" pra não cansar. Sem coluna de origem
 * técnica na visão do comprador (fica no dado, pro Premium). Limiares gradativos,
 * afináveis. Ver feedback do usuário (17 anos de mercado): menos técnico, mais claro.
 */
function montarFichas(anuncio: AnuncioBia, nums: Numeros): FichaCategoria[] {
  const fichas: FichaCategoria[] = [];
  const add = (categoria: string, estrelas: number | null, origem: FichaCategoria["origem"]) => {
    if (estrelas != null) fichas.push({ categoria, estrelas, origem });
  };

  // Margem (Preço vs FIPE) e KM = os PILARES, com a escala de mercado do usuário.
  add("Preço vs FIPE", estrelasMargem(anuncio.margem_percentual), "Calculado");
  add("Quilometragem", estrelasKm(anuncio.km), "Anúncio");

  // Preço vs. MERCADO (concorrentes reais) — UMA avaliação só. "Posição no ranking"
  // e "distância da média" são o mesmo fundamento (não contar em dobro): prefere o
  // ranking (percentil de desconto, mais amostra); cai pra distância da média quando
  // o ranking não tem coorte. A posição exata ("12ª de 43") fica no parecer.
  const pd = nums.percentil_desconto;
  const vm = nums.percentual_mercado;
  const estrelasMercado =
    pd != null
      ? pd <= 5 ? 5 : pd <= 15 ? 4 : pd <= 33 ? 3 : pd <= 60 ? 2 : 1
      : vm != null
        ? porFaixa(-vm, [[0, 1.5], [3, 2.5], [6, 3.5], [10, 4.5], [14, 5]])
        : null;
  add("Preço vs. mercado", estrelasMercado, "Benchmark interno");

  // Procedência = HISTÓRICO do carro (não estado financeiro). Régua do usuário:
  // base 3; leilão trava em 1; único dono +1; revisões em concessionária +1.
  // IPVA/multas/quitado são estado FINANCEIRO → fora da procedência (decisão do usuário).
  const attr = (k: string) => anuncio.atributos_olx?.[k]?.value ?? null;
  const temAtributos = Object.keys(anuncio.atributos_olx ?? {}).length > 0;
  const procedencia = () => {
    if (attr("has_auction") === "Sim") return 1; // leilão trava
    let e = 3;
    if (attr("owner") === "Sim") e += 1; // único dono
    if (attr("dealership_review") === "Sim") e += 1; // revisões em concessionária
    return Math.min(5, e);
  };
  add("Procedência", !temAtributos ? null : procedencia(), "Anúncio");

  const fotos = (anuncio.foto_principal ? 1 : 0) + (anuncio.fotos_secundarias?.length ?? 0);
  const temDescricao = (anuncio.descricao?.trim().length ?? 0) >= 60;
  const nAtrib = Object.keys(anuncio.atributos_olx ?? {}).length;
  const nivelInfo = fotos === 0 && nAtrib === 0 ? null : fotos >= 6 && temDescricao && nAtrib >= 8 ? 5 : fotos >= 4 && (temDescricao || nAtrib >= 5) ? 4 : 3;
  add("Nível de Informações", nivelInfo, "Anúncio");

  return fichas;
}

/** Parecer INSTRUTIVO (veredito → posição). Sem contagem de "pontos" (soava fraco). */
function montarParecer(classificacao: string, nums: Numeros): string {
  let txt = `**${classificacao}.**`;
  if (nums.posicao && nums.coorteTamanho) {
    txt += ` Está na ${nums.posicao}ª posição de melhor preço entre ${nums.coorteTamanho} veículos monitorados.`;
  }
  return txt;
}
