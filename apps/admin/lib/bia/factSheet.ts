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
    copiloto: montarParecer(classificacao, nums, fichas),
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

// Média de km/ano do mercado ATUAL (o povo roda mais hoje que os "10 mil/ano" de
// 15 anos atrás) — número da experiência prática do usuário.
const KM_POR_ANO = 20000;

/**
 * Estrelas de KM — AGE-AWARE: km vs. o ESPERADO pra idade (idade × 20 mil/ano).
 * "Equaliza" carros velhos (um 2012 com 152k rodou ~12k/ano = bom, não 1★) e
 * pune km alto em carro novo. Teto de DURABILIDADE por desgaste absoluto (km
 * gigante = motor gasto, independente da idade). Guard de dado sujo (<1000).
 */
function estrelasKm(km: number | null, ano: string | null): number | null {
  if (km == null || km < 1000) return null;
  const anoNum = Number.parseInt(ano ?? "", 10);
  const idade = Number.isFinite(anoNum) ? Math.max(1, new Date().getFullYear() - anoNum) : 8;
  const ratio = km / (idade * KM_POR_ANO);

  let e =
    ratio <= 0.5 ? 5
    : ratio <= 0.65 ? 4.5
    : ratio <= 0.8 ? 4
    : ratio <= 1.0 ? 3.5
    : ratio <= 1.2 ? 3
    : ratio <= 1.5 ? 2.5
    : ratio <= 1.8 ? 2
    : ratio <= 2.2 ? 1.5
    : 1;

  // PISO: km baixo em ABSOLUTO (≤30 mil) tem percepção boa mesmo em carro novo —
  // não penaliza só pelo quesito tempo. Mínimo ★★★ (o ratio ainda leva a 4-5★ se
  // for carro mais velho com km baixa). Decisão do usuário.
  if (km <= 30000) e = Math.max(e, 3);

  // Teto de durabilidade (desgaste absoluto) — honra o padrão de vida útil do motor.
  if (km >= 300000) e = Math.min(e, 1);
  else if (km >= 250000) e = Math.min(e, 2);
  else if (km >= 200000) e = Math.min(e, 3);
  return e;
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
  add("Quilometragem", estrelasKm(anuncio.km, anuncio.ano), "Anúncio");

  // Preço vs. MERCADO (concorrentes reais) — UMA avaliação só. "Posição no ranking"
  // e "distância da média" são o mesmo fundamento (não contar em dobro): prefere o
  // ranking (percentil de desconto, mais amostra); cai pra distância da média quando
  // o ranking não tem coorte. A posição exata ("12ª de 43") fica no parecer.
  const pd = nums.percentil_desconto;
  const vm = nums.percentual_mercado;
  // Faixas com MEIA-ESTRELA (cada intervalo dividido no meio) — decisão do usuário.
  const estrelasMercado =
    pd != null
      ? pd <= 5 ? 5 : pd <= 10 ? 4.5 : pd <= 15 ? 4 : pd <= 24 ? 3.5 : pd <= 33 ? 3 : pd <= 46 ? 2.5 : pd <= 60 ? 2 : pd <= 80 ? 1.5 : 1
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
    if (attr("warranty") === "Sim") e += 1; // com garantia (quase sempre fábrica) — confiança
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

// Frase do pilar que mais se destaca (ponte pra prosa humana; a LLM na Fase C
// reescreve tudo a partir do fact-sheet).
const FRASE_PILAR: Record<string, string> = {
  "Preço vs FIPE": "pelo desconto sobre a tabela FIPE",
  "Preço vs. mercado": "pelo preço frente aos concorrentes",
  Quilometragem: "pela quilometragem",
  Procedência: "pela procedência",
};

/** Parecer INSTRUTIVO (veredito → destaque do pilar mais forte → posição). */
function montarParecer(classificacao: string, nums: Numeros, fichas: FichaCategoria[]): string {
  let txt = `**${classificacao}.**`;
  const top = fichas
    .filter((f) => FRASE_PILAR[f.categoria] && f.estrelas != null)
    .sort((a, b) => (b.estrelas ?? 0) - (a.estrelas ?? 0))[0];
  if (top && (top.estrelas ?? 0) >= 4) {
    txt += ` Destaca-se principalmente ${FRASE_PILAR[top.categoria]}.`;
  }
  if (nums.posicao && nums.coorteTamanho) {
    txt += ` Está na ${nums.posicao}ª posição de melhor preço entre ${nums.coorteTamanho} veículos monitorados.`;
  }
  return txt;
}
