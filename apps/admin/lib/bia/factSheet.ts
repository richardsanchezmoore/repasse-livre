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

  // ---- score 0–100, intuitivo (bom negócio ~85–95) ----
  const m = anuncio.margem_percentual ?? 0;
  const bonusFipe = m >= 20 ? 30 : m >= 15 ? 26 : m >= 10 ? 22 : m >= 7 ? 15 : m >= 5 ? 10 : 0;
  const bonusEvid = Math.min(20, Math.max(0, positivos.length - 1) * 4); // além do desconto-FIPE
  const pd = nums.percentil_desconto;
  const bonusPercentil = pd == null ? 0 : pd <= 5 ? 10 : pd <= 15 ? 6 : pd <= 30 ? 3 : 0;
  const penalidade = ehLeilao ? 36 : 0;
  const score =
    anuncio.margem_percentual == null && positivos.length === 0
      ? null
      : Math.round(clamp(50 + bonusFipe + bonusEvid + bonusPercentil - penalidade, 0, 100));

  // Cobertura de dado (interno/Premium; não exibido ao comprador comum).
  const cobertura = Math.min(1, evidencias.length / 6);
  const amostra = Math.min(1, (nums.coorteTamanho ?? 0) / 50);
  const grau_confianca = Math.round(100 * (0.55 * cobertura + 0.45 * amostra));

  const classificacao = classificar(score, ehLeilao);

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
    copiloto: montarParecer(classificacao, positivos.length, nums, ehLeilao),
    destaques: positivos.map((e) => e.texto),
    fichas: montarFichas(anuncio, nums),
    evidencias,
  };
}

/** Veredito humano a partir do score. Leilão nunca vira "excelente". */
function classificar(score: number | null, ehLeilao: boolean): string {
  if (score == null) return "Sem dados suficientes";
  if (ehLeilao) return score >= 55 ? "Oportunidade com ressalva" : "Requer atenção";
  if (score >= 80) return "Excelente oportunidade";
  if (score >= 65) return "Boa oportunidade";
  if (score >= 50) return "Oportunidade razoável";
  return "Preço na média do mercado";
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

  const m = anuncio.margem_percentual;
  add("Preço vs FIPE", m == null ? null : porFaixa(m, [[5, 2], [8, 3], [12, 4], [16, 5]]), "Calculado");

  // Posição de preço (percentil de desconto; menor = melhor). Gradual, sem cliff.
  const pd = nums.percentil_desconto;
  add("Posição de preço", pd == null ? null : pd <= 5 ? 5 : pd <= 15 ? 4 : pd <= 33 ? 3 : pd <= 60 ? 2 : 1, "Benchmark interno");

  const vm = nums.percentual_mercado;
  add("Preço vs. média do modelo", vm == null ? null : porFaixa(-vm, [[0, 2], [3, 3], [8, 4], [13, 5]]), "Benchmark interno");

  const kmp = nums.km_percentil;
  add("Quilometragem", kmp == null ? null : kmp <= 20 ? 5 : kmp <= 40 ? 4 : kmp <= 60 ? 3 : kmp <= 80 ? 2 : 1, "Benchmark interno");

  // Procedência + Nível de Informações vêm dos atributos do anúncio.
  const attr = (k: string) => anuncio.atributos_olx?.[k]?.value ?? null;
  const temAtributos = Object.keys(anuncio.atributos_olx ?? {}).length > 0;
  add("Procedência", !temAtributos ? null : attr("has_auction") === "Sim" ? 1 : attr("is_settled") === "Sim" ? 5 : 4, "Anúncio");

  const fotos = (anuncio.foto_principal ? 1 : 0) + (anuncio.fotos_secundarias?.length ?? 0);
  const temDescricao = (anuncio.descricao?.trim().length ?? 0) >= 60;
  const nAtrib = Object.keys(anuncio.atributos_olx ?? {}).length;
  const nivelInfo = fotos === 0 && nAtrib === 0 ? null : fotos >= 6 && temDescricao && nAtrib >= 8 ? 5 : fotos >= 4 && (temDescricao || nAtrib >= 5) ? 4 : 3;
  add("Nível de Informações", nivelInfo, "Anúncio");

  return fichas;
}

/** Parecer INSTRUTIVO (veredito → motivo → posição). Menos %, mais prática. */
function montarParecer(classificacao: string, nPos: number, nums: Numeros, ehLeilao: boolean): string {
  if (nPos === 0 && !ehLeilao) return "Ainda não reunimos evidências suficientes para um parecer neste anúncio.";
  let txt = `**${classificacao}.**`;
  if (nPos > 0) txt += ` Reúne ${nPos} ${nPos === 1 ? "ponto positivo" : "pontos positivos"} acima da média da nossa base.`;
  if (nums.posicao && nums.coorteTamanho) {
    txt += ` Está na ${nums.posicao}ª posição de melhor preço entre ${nums.coorteTamanho} veículos monitorados.`;
  }
  return txt;
}
