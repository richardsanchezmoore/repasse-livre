import type { Oportunidade } from "./types";

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  oportunidade: "Oportunidade",
  grande_oportunidade: "Grande oportunidade",
  oportunidade_premium: "Oportunidade premium",
  top_oportunidade: "Top oportunidade",
};

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Texto pronto para colar no WhatsApp (canal/comunidade) junto com a foto
 * principal do anúncio. O WhatsApp não renderiza HTML, então o card visual
 * da Central não é o que é compartilhado — o operador copia este texto e
 * a foto separadamente.
 */
export function gerarTextoCompartilhamento(oportunidade: Oportunidade): string {
  const rotulo = oportunidade.classificacao ? ROTULO_CLASSIFICACAO[oportunidade.classificacao] : null;

  const linhas = [
    `🚗 *${oportunidade.veiculo}*`,
    oportunidade.versao && oportunidade.versao !== oportunidade.veiculo ? oportunidade.versao : null,
    "",
    oportunidade.ano ? `📅 Ano: ${oportunidade.ano}` : null,
    oportunidade.cambio ? `⚙️ Câmbio: ${oportunidade.cambio}` : null,
    oportunidade.cidade ? `📍 ${oportunidade.cidade} - ${oportunidade.estado ?? ""}` : null,
    "",
    `💰 Por: ${formatarMoeda(oportunidade.preco)}`,
    `📊 FIPE: ${formatarMoeda(oportunidade.fipe_valor)}`,
    oportunidade.margem_percentual !== null
      ? `🔥 ${oportunidade.margem_percentual.toFixed(1)}% abaixo da FIPE${rotulo ? ` — ${rotulo}` : ""}`
      : null,
    "",
    `🔗 Anúncio original: ${oportunidade.link_origem}`,
  ];

  return linhas.filter((linha) => linha !== null).join("\n");
}
