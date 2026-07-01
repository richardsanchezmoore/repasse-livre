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
