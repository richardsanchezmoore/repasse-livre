import type { AnuncioBia, Evidencia, FactSheet, PontoPreco } from "./tipos";
import { montarCoorte } from "./coorte";
import { atributoSim, lerAtributo } from "../atributos";

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

const nada: ResultadoIndicador = { evidencia: null };

// ---------------------------------------------------------------------------
// INTRÍNSECOS (só o anúncio) — não dependem de coorte, nunca ficam stale.
// ---------------------------------------------------------------------------

export function descontoFipe({ anuncio }: CtxIndicador): ResultadoIndicador {
  const m = anuncio.margem_percentual;
  // O fato do desconto NÃO depende do piso de captação — qualquer carro ABAIXO
  // da FIPE (margem > 0) tem desconto, e isso é FATO. Amarrar num piso (era 5%,
  // depois seria 3%) recria a armadilha: a LLM, sem o fato, alucina "acima da
  // FIPE / sem vantagem" (Pajero 4,6% = R$14.803 dizia "não oferece vantagem").
  // Independente do piso: some a armadilha pra qualquer valor de piso (e cobre
  // até o carro que caiu abaixo do piso pela virada da FIPE).
  if (m == null || m <= 0) return nada;
  return {
    evidencia: {
      chave: "desconto_fipe",
      tipo: "positivo",
      texto: `${m.toFixed(1).replace(".", ",")}% abaixo da FIPE`,
      origem: "Calculado",
      peso: m >= 10 ? 3 : m >= 5 ? 2 : 1, // 3–5% é desconto modesto → peso menor
    },
    numeros: { percentual_fipe: Number(m.toFixed(1)) },
  };
}

export function alertaLeilao({ anuncio }: CtxIndicador): ResultadoIndicador {
  if (!atributoSim(anuncio.atributos_olx, "has_auction")) return nada;
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
  if (!atributoSim(anuncio.atributos_olx, "owner")) return nada;
  return {
    evidencia: { chave: "unico_dono", tipo: "positivo", texto: "Único dono", origem: "Anúncio", peso: 1 },
  };
}

export function quitado({ anuncio }: CtxIndicador): ResultadoIndicador {
  if (!atributoSim(anuncio.atributos_olx, "is_settled")) return nada;
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

/** KM baixo — ABSOLUTO (a estrela de KM usa a escala do usuário; aqui só o ✔). */
export function kmRaridade({ anuncio }: CtxIndicador): ResultadoIndicador {
  const km = anuncio.km;
  if (km == null || km < 1000) return nada; // km sujo (<1000) não vira destaque
  // Texto por DURABILIDADE (não "para a idade" — evita conflito com percepção
  // regional; a escala de estrelas segue absoluta, decisão do usuário).
  const ev: Evidencia | null =
    km <= 75000
      ? {
          chave: "km",
          tipo: "positivo",
          texto: km < 40000 ? "Quilometragem boa" : "Quilometragem dentro de uma média razoável",
          origem: "Anúncio",
          peso: km < 40000 ? 2 : 1,
        }
      : null;
  return { evidencia: ev };
}

/** Cor pouco comum — fato NEUTRO (raro nem sempre é bom pra revenda). */
export function corRaridade({ anuncio, universo }: CtxIndicador): ResultadoIndicador {
  const cor = lerAtributo(anuncio.atributos_olx, "carcolor");
  if (!cor) return nada;
  const comCor = universo.filter((x) => lerAtributo(x.atributos_olx, "carcolor"));
  if (comCor.length < 20) return nada;
  const mesma = comCor.filter((x) => lerAtributo(x.atributos_olx, "carcolor") === cor).length;
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
