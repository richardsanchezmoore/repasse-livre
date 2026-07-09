import type { ItemTendenciaDestaque } from "@/lib/biaDashboard";

/**
 * Texto determinístico (sem chamada de IA) a partir da variação de margem e
 * volume mês a mês de um destaque. Reavaliar geração via LLM quando houver
 * mais profundidade de série histórica (ver project_repasse_livre_visao_bia_fases).
 */
export function gerarInsightTendencia(item: ItemTendenciaDestaque): string {
  const { marca, modelo, margemMesAtual, margemMesAnterior, quantidadeMesAtual, quantidadeMesAnterior } = item;

  if (margemMesAtual === null || margemMesAnterior === null) {
    return `${marca} ${modelo}: sem margem média comparável entre os dois meses.`;
  }

  const direcaoMargem = margemMesAtual > margemMesAnterior ? "subiu" : margemMesAtual < margemMesAnterior ? "caiu" : "ficou estável";
  const margemTexto =
    margemMesAtual === margemMesAnterior
      ? `ficou estável em ${margemMesAtual.toFixed(1)}%`
      : `${direcaoMargem} de ${margemMesAnterior.toFixed(1)}% para ${margemMesAtual.toFixed(1)}%`;

  const variacaoVolumePercentual =
    quantidadeMesAnterior > 0 ? ((quantidadeMesAtual - quantidadeMesAnterior) / quantidadeMesAnterior) * 100 : null;

  const volumeTexto =
    variacaoVolumePercentual === null
      ? "sem oferta comparável no mês anterior"
      : variacaoVolumePercentual > 0
        ? `oferta cresceu ${variacaoVolumePercentual.toFixed(0)}% no mês`
        : variacaoVolumePercentual < 0
          ? `oferta recuou ${Math.abs(variacaoVolumePercentual).toFixed(0)}% no mês`
          : "oferta ficou estável no mês";

  return `${marca} ${modelo}: margem média ${margemTexto}, ${volumeTexto}.`;
}

export type TomTendencia = "alta" | "baixa" | "estavel";

export interface AnaliseTendencia {
  volAtual: number;
  volAnterior: number;
  volDeltaPct: number | null;
  volTom: TomTendencia;
  margemAtual: number | null;
  margemAnterior: number | null;
  margemDeltaPp: number | null;
  margemTom: TomTendencia;
  /** Leitura de analista sobre oferta × margem, no espírito do Copiloto. */
  mensagem: string;
}

// Limiares pra chamar de "mudança" (senão vira ruído): oferta ±8%, margem ±0,8pp.
const LIMIAR_VOL_PCT = 8;
const LIMIAR_MARGEM_PP = 0.8;

/**
 * Analisa a variação mês a mês de oferta (volume) e margem de um modelo e monta
 * uma leitura de decisão (determinística, sem LLM) — mais oferta + margem menor =
 * procura aquecida, aproveite o volume pra negociar; e assim por diante.
 */
export function analisarTendencia(item: ItemTendenciaDestaque): AnaliseTendencia {
  const { modelo, margemMesAtual, margemMesAnterior, quantidadeMesAtual, quantidadeMesAnterior } = item;

  const volDeltaPct =
    quantidadeMesAnterior > 0
      ? ((quantidadeMesAtual - quantidadeMesAnterior) / quantidadeMesAnterior) * 100
      : null;
  const volTom: TomTendencia =
    volDeltaPct === null
      ? "estavel"
      : volDeltaPct >= LIMIAR_VOL_PCT
        ? "alta"
        : volDeltaPct <= -LIMIAR_VOL_PCT
          ? "baixa"
          : "estavel";

  const margemDeltaPp =
    margemMesAtual !== null && margemMesAnterior !== null ? margemMesAtual - margemMesAnterior : null;
  const margemTom: TomTendencia =
    margemDeltaPp === null
      ? "estavel"
      : margemDeltaPp >= LIMIAR_MARGEM_PP
        ? "alta"
        : margemDeltaPp <= -LIMIAR_MARGEM_PP
          ? "baixa"
          : "estavel";

  const volPct = volDeltaPct === null ? 0 : Math.round(Math.abs(volDeltaPct));
  const mA = margemMesAtual !== null ? `${margemMesAtual.toFixed(1)}%` : "—";
  const mAnt = margemMesAnterior !== null ? `${margemMesAnterior.toFixed(1)}%` : "—";

  let mensagem: string;
  if (margemMesAtual === null || margemMesAnterior === null) {
    mensagem = `O ${modelo} ainda não tem margem comparável entre os dois meses — a leitura fica mais rica quando a série acumular mais dados.`;
  } else if (volTom === "alta" && margemTom === "baixa") {
    mensagem = `A oferta do ${modelo} subiu ${volPct}% e a margem recuou (${mAnt} → ${mA}). Mais oferta com margem menor costuma indicar procura aquecida — aproveite o volume maior pra garimpar a melhor negociação.`;
  } else if (volTom === "alta" && margemTom === "alta") {
    mensagem = `Mês favorável pro ${modelo}: mais oferta (+${volPct}%) e margem melhor (${mAnt} → ${mA}). Mais opções e desconto mais gordo vs. FIPE — bom momento pra comprar.`;
  } else if (volTom === "alta" && margemTom === "estavel") {
    mensagem = `A oferta do ${modelo} cresceu ${volPct}% com a margem estável (~${mA}) — mais opções pra escolher sem abrir mão do desconto.`;
  } else if (volTom === "baixa" && margemTom === "alta") {
    mensagem = `A oferta do ${modelo} caiu ${volPct}% e a margem subiu (${mAnt} → ${mA}). Escassez valorizando a barganha: quando aparece, o desconto está mais gordo — vale agir rápido.`;
  } else if (volTom === "baixa" && margemTom === "baixa") {
    mensagem = `O ${modelo} está com menos oferta (−${volPct}%) e margem menor (${mAnt} → ${mA}) — modelo aquecido, a janela de barganha está apertando.`;
  } else if (volTom === "baixa" && margemTom === "estavel") {
    mensagem = `A oferta do ${modelo} recuou ${volPct}% com a margem estável (~${mA}) — menos opções no mês, mas o desconto se manteve.`;
  } else if (volTom === "estavel" && margemTom === "alta") {
    mensagem = `Oferta estável e margem em alta (${mAnt} → ${mA}) no ${modelo} — o desconto vs. FIPE melhorou; vale ficar de olho.`;
  } else if (volTom === "estavel" && margemTom === "baixa") {
    mensagem = `Oferta estável, mas margem menor (${mAnt} → ${mA}) no ${modelo} — procura firme segurando o preço.`;
  } else {
    mensagem = `O ${modelo} seguiu estável mês a mês, em oferta e margem — comportamento em linha com o mês passado.`;
  }

  return {
    volAtual: quantidadeMesAtual,
    volAnterior: quantidadeMesAnterior,
    volDeltaPct,
    volTom,
    margemAtual: margemMesAtual,
    margemAnterior: margemMesAnterior,
    margemDeltaPp,
    margemTom,
    mensagem,
  };
}
