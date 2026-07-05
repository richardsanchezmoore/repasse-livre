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

  // ---- score: composto, transparente (provisório, afinável) ----
  const base = clamp((anuncio.margem_percentual ?? 0) * 3, 0, 60); // desconto = espinha
  const pontosPos = evidencias.filter((e) => e.tipo === "positivo").reduce((s, e) => s + e.peso, 0);
  const pontosAlerta = evidencias.filter((e) => e.tipo === "alerta").reduce((s, e) => s + e.peso, 0);
  const score =
    anuncio.margem_percentual == null ? null : Math.round(clamp(base + pontosPos * 4 - pontosAlerta * 8, 0, 100));

  // ---- grau de confiança: COBERTURA de dado (não "é bom"), com lastro na amostra ----
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
    fichas: montarFichas(anuncio, nums, dias, evidencias),
    evidencias,
    copiloto: montarParecer(evidencias),
  };
}

/**
 * Fichário técnico (parecer de analista): cada categoria vira estrelas + origem.
 * `null` = sem dado suficiente → a UI mostra "N/D" (honesto, não inventa nota).
 * Limiares transparentes e afináveis. Estrelas ≥1 quando há dado; a coluna de
 * origem é a credibilidade que o usuário paga.
 */
function montarFichas(
  anuncio: AnuncioBia,
  nums: Numeros,
  dias: number,
  evidencias: FactSheet["evidencias"]
): FichaCategoria[] {
  const temEvid = (chave: string) => evidencias.some((e) => e.chave === chave);
  const fichas: FichaCategoria[] = [];

  // Preço vs FIPE — sempre (é o nosso âncora)
  const m = anuncio.margem_percentual;
  fichas.push({
    categoria: "Preço vs FIPE",
    estrelas: m == null ? null : porFaixa(m, [[5, 2], [8, 3], [12, 4], [16, 5]]),
    origem: "Calculado",
  });

  // Posição de desconto (percentil, menor = melhor)
  fichas.push({
    categoria: "Posição de desconto",
    estrelas: nums.percentil_desconto == null ? null : porFaixa(101 - nums.percentil_desconto, [[75, 3], [90, 4], [95, 5]]),
    origem: "Benchmark interno",
  });

  // Preço vs mercado (mais abaixo da média = melhor)
  fichas.push({
    categoria: "Preço vs mercado",
    estrelas: nums.percentual_mercado == null ? null : porFaixa(-nums.percentual_mercado, [[0, 2], [3, 3], [8, 4], [13, 5]]),
    origem: "Benchmark interno",
  });

  // Quilometragem (percentil, menor = melhor). Mediano ~★★★, sem cliff seco.
  const kmp = nums.km_percentil;
  fichas.push({
    categoria: "Quilometragem",
    estrelas: kmp == null ? null : kmp <= 20 ? 5 : kmp <= 40 ? 4 : kmp <= 60 ? 3 : kmp <= 80 ? 2 : 1,
    origem: "Benchmark interno",
  });

  // Procedência — leilão derruba; sem leilão + quitado sobe
  const ehLeilao = temEvid("leilao");
  const temAtributos = Object.keys(anuncio.atributos_olx ?? {}).length > 0;
  fichas.push({
    categoria: "Procedência",
    estrelas: !temAtributos ? null : ehLeilao ? 1 : temEvid("quitado") ? 5 : 4,
    origem: "Anúncio",
  });

  // Consistência do anúncio
  fichas.push({
    categoria: "Consistência do anúncio",
    estrelas: !temAtributos ? null : temEvid("consistencia") ? 5 : 3,
    origem: "Anúncio",
  });

  // Histórico de preço — ainda acumulando (Stage 1a). Reduções sobem; só idade = base.
  fichas.push({
    categoria: "Histórico de preço",
    estrelas: nums.historico_reducoes && nums.historico_reducoes > 0 ? 5 : dias >= 15 ? 3 : dias >= 3 ? 2 : null,
    origem: "Snapshots",
  });

  return fichas;
}

/**
 * Parecer determinístico (template) — Fase A. Fase C: o LLM recebe `evidencias`
 * e reescreve em prosa. Estrutura: positivos → neutros → alertas (⚠️ no fim).
 */
function montarParecer(evidencias: FactSheet["evidencias"]): string {
  const pos = evidencias.filter((e) => e.tipo === "positivo").map((e) => e.texto);
  const neu = evidencias.filter((e) => e.tipo === "neutro").map((e) => e.texto);
  const ale = evidencias.filter((e) => e.tipo === "alerta").map((e) => e.texto);
  if (pos.length === 0 && ale.length === 0) return "Dados insuficientes para um parecer neste anúncio.";

  const partes: string[] = [];
  if (pos.length) partes.push(pos.join(". ") + ".");
  if (neu.length) partes.push(neu.join(". ") + ".");
  let texto = partes.join(" ");
  if (ale.length) texto += ` ⚠️ ${ale.join(" ")}`;
  return texto;
}
