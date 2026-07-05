import type { AnuncioBia, Evidencia, FactSheet, PontoPreco } from "./tipos";
import { montarCoorte } from "./coorte";

/**
 * Cada indicador recebe o contexto e devolve uma evidência (ou null se o gate de
 * amostra não bateu / dado ausente) + os números crus que produz. O fact-sheet
 * orquestra todos. NENHUM inventa: sem dado suficiente → não nasce.
 */
export interface CtxIndicador {
  anuncio: AnuncioBia;
  universo: AnuncioBia[]; // ativos com o mesmo fipe_codigo (qualquer ano/região)
  precoLog: PontoPreco[];
}

export type Numeros = Partial<
  Pick<
    FactSheet,
    | "percentual_fipe"
    | "percentual_mercado"
    | "percentil_desconto"
    | "km_percentil"
    | "indice_exclusividade"
    | "historico_reducoes"
  >
> & { coorteEscopo?: string; coorteTamanho?: number; posicao?: number };

export interface ResultadoIndicador {
  evidencia: Evidencia | null;
  numeros?: Numeros;
}

const attr = (a: AnuncioBia, chave: string): string | null => a.atributos_olx?.[chave]?.value ?? null;
const nada: ResultadoIndicador = { evidencia: null };

// ---------------------------------------------------------------------------
// INTRÍNSECOS (só o anúncio) — não dependem de coorte, nunca ficam stale.
// ---------------------------------------------------------------------------

export function descontoFipe({ anuncio }: CtxIndicador): ResultadoIndicador {
  const m = anuncio.margem_percentual;
  if (m == null || m < 5) return nada;
  return {
    evidencia: {
      chave: "desconto_fipe",
      tipo: "positivo",
      texto: `${m.toFixed(1).replace(".", ",")}% abaixo da FIPE`,
      origem: "Calculado",
      peso: m >= 10 ? 3 : 2,
    },
    numeros: { percentual_fipe: Number(m.toFixed(1)) },
  };
}

export function alertaLeilao({ anuncio }: CtxIndicador): ResultadoIndicador {
  if (attr(anuncio, "has_auction") !== "Sim") return nada;
  return {
    evidencia: {
      chave: "leilao",
      tipo: "alerta",
      texto: "Veículo de leilão — o preço abaixo do mercado pode refletir o histórico. Confira a procedência.",
      origem: "Anúncio",
      peso: 3,
    },
  };
}

export function unicoDono({ anuncio }: CtxIndicador): ResultadoIndicador {
  if (attr(anuncio, "owner") !== "Sim") return nada;
  return {
    evidencia: { chave: "unico_dono", tipo: "positivo", texto: "Único dono", origem: "Anúncio", peso: 1 },
  };
}

export function quitado({ anuncio }: CtxIndicador): ResultadoIndicador {
  if (attr(anuncio, "is_settled") !== "Sim") return nada;
  return {
    evidencia: { chave: "quitado", tipo: "positivo", texto: "Quitado", origem: "Anúncio", peso: 1 },
  };
}

export function historicoReducoes({ precoLog, anuncio }: CtxIndicador): ResultadoIndicador {
  // O baseline está em opportunities; o log guarda só MUDANÇAS. Reduções = quedas.
  const pontos = [...precoLog].sort((a, b) => Date.parse(a.visto_em) - Date.parse(b.visto_em));
  const serie = [anuncio.preco, ...pontos.map((p) => p.preco)]; // aproximação; refina com baseline real
  let reducoes = 0;
  let maiorQueda = 0;
  const precos = pontos.map((p) => p.preco);
  if (precos.length === 0) return { evidencia: null, numeros: { historico_reducoes: 0 } };
  const cronologico = [...precos];
  for (let i = 1; i < cronologico.length; i++) {
    if (cronologico[i] < cronologico[i - 1]) {
      reducoes++;
      maiorQueda += cronologico[i - 1] - cronologico[i];
    }
  }
  void serie;
  if (reducoes === 0) return { evidencia: null, numeros: { historico_reducoes: 0 } };
  return {
    evidencia: {
      chave: "reducoes",
      tipo: "positivo",
      texto:
        reducoes === 1
          ? "Vendedor já baixou o preço (aberto a negociar)"
          : `Vendedor baixou o preço ${reducoes}× (aberto a negociar)`,
      origem: "Snapshots",
      peso: 2,
    },
    numeros: { historico_reducoes: reducoes },
  };
}

// ---------------------------------------------------------------------------
// RELATIVOS À COORTE (recalculados na leitura) — o gate atua aqui.
// ---------------------------------------------------------------------------

/** Percentil de DESCONTO (margem). Amplo no ano (FIPE normaliza). Min 25. */
export function percentilDesconto({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  if (anuncio.margem_percentual == null) return nada;
  const c = montarCoorte(universo, anuncio, { metrica: "desconto", minimo: 25 });
  if (!c.suficiente) return nada;
  const minha = anuncio.margem_percentual;
  const melhores = c.itens.filter((x) => (x.margem_percentual ?? -Infinity) > minha).length;
  const posicao = melhores + 1;
  const topPct = Math.max(1, Math.round((posicao / c.tamanho) * 100));
  // Só vira DESTAQUE (✔) quando é realmente impressionante (top ~15%); senão a
  // posição já aparece no veredito ("Xª de Y"), sem poluir com % fraco.
  const ev: Evidencia | null =
    topPct <= 15
      ? { chave: "percentil_desconto", tipo: "positivo", texto: `Entre os ${topPct}% com melhor preço do modelo`, origem: "Benchmark interno", peso: topPct <= 5 ? 3 : 2 }
      : null;
  return { evidencia: ev, numeros: { percentil_desconto: topPct, coorteEscopo: c.escopo, coorteTamanho: c.tamanho, posicao } };
}

/** Posição de PREÇO absoluto — mesmo ano. Min 8. Dá % vs média + ranking. */
export function posicaoPreco({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  const c = montarCoorte(universo, anuncio, { metrica: "preco", minimo: 8 });
  if (!c.suficiente) return nada;
  const precos = c.itens.map((x) => x.preco).filter((p) => p > 0);
  const media = precos.reduce((s, p) => s + p, 0) / precos.length;
  const vsMedia = ((anuncio.preco - media) / media) * 100;
  const maisBaratos = c.itens.filter((x) => x.preco < anuncio.preco).length;
  const posicao = maisBaratos + 1;
  void posicao;
  const ev: Evidencia | null =
    vsMedia <= -3
      ? {
          chave: "posicao_preco",
          tipo: "positivo",
          texto: `R$ ${Math.round(media - anuncio.preco).toLocaleString("pt-BR")} abaixo da média do modelo`,
          origem: "Benchmark interno",
          peso: 2,
        }
      : null;
  return { evidencia: ev, numeros: { percentual_mercado: Number(vsMedia.toFixed(1)) } };
}

/** Exclusividade regional: dos N no estado, quantos tão tão bons quanto este. */
export function exclusividade({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  if (anuncio.margem_percentual == null) return nada;
  const c = montarCoorte(universo, anuncio, { metrica: "desconto", minimo: 10 });
  if (!c.suficiente) return nada;
  const limiar = Math.max(15, Math.floor(anuncio.margem_percentual));
  const bons = c.itens.filter((x) => (x.margem_percentual ?? -Infinity) >= limiar).length;
  const indice = Math.round((1 - bons / c.tamanho) * 100);
  const esteEstaEntre = anuncio.margem_percentual >= limiar;
  // Só emite o número (e a frase) quando ESTE anúncio é um dos poucos "bons" —
  // senão o índice descreveria uma exclusividade da qual ele não faz parte.
  if (!esteEstaEntre || bons > Math.max(6, c.tamanho * 0.12)) {
    return nada;
  }
  return {
    evidencia: {
      chave: "exclusividade",
      tipo: "positivo",
      texto: bons <= 1 ? "É o melhor preço do modelo na sua região" : `Um dos ${bons} melhores preços do modelo na sua região`,
      origem: "Base monitorada",
      peso: 3,
    },
    numeros: { indice_exclusividade: indice },
  };
}

/** Raridade de KM: quantos têm KM menor. Min 8. */
export function kmRaridade({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  if (anuncio.km == null || anuncio.km <= 0) return nada;
  // KM é comparável entre anos próximos do mesmo modelo (pouco rodado é pouco
  // rodado), então usa a coorte AMPLA no ano — mais amostra que o preço.
  const c = montarCoorte(universo, anuncio, { metrica: "desconto", minimo: 8 });
  const comKm = c.itens.filter((x) => x.km != null && x.km > 0);
  if (comKm.length < 8) return nada;
  const menores = comKm.filter((x) => (x.km ?? Infinity) < (anuncio.km ?? Infinity)).length;
  const pct = Math.max(1, Math.round(((menores + 1) / comKm.length) * 100));
  const ev: Evidencia | null =
    pct <= 40
      ? {
          chave: "km",
          tipo: "positivo",
          texto: pct <= 20 ? "Quilometragem baixa para o modelo" : "Quilometragem abaixo da média do modelo",
          origem: "Benchmark interno",
          peso: pct <= 20 ? 2 : 1,
        }
      : null;
  return { evidencia: ev, numeros: { km_percentil: pct } };
}

/** Cor pouco comum — fato NEUTRO (raro nem sempre é bom pra revenda). */
export function corRaridade({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  const cor = attr(anuncio, "carcolor");
  if (!cor) return nada;
  const comCor = universo.filter((x) => attr(x, "carcolor"));
  if (comCor.length < 20) return nada;
  const mesma = comCor.filter((x) => attr(x, "carcolor") === cor).length;
  const pct = Math.round((mesma / comCor.length) * 100);
  if (pct > 12) return nada; // só destaca se realmente incomum
  return {
    evidencia: {
      chave: "cor",
      tipo: "neutro",
      texto: `Cor pouco comum neste modelo (${cor.toLowerCase()})`,
      origem: "Base monitorada",
      peso: 0,
    },
  };
}

export const INDICADORES: ((ctx: CtxIndicador) => ResultadoIndicador)[] = [
  descontoFipe,
  percentilDesconto,
  posicaoPreco,
  exclusividade,
  kmRaridade,
  corRaridade,
  historicoReducoes,
  alertaLeilao,
  unicoDono,
  quitado,
];
