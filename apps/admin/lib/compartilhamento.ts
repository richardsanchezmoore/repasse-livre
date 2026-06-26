import { ROTULO_CLASSIFICACAO, type Classificacao } from "./classificacao";
import { formatarMoeda } from "./formatadores";
import { urlOportunidade } from "./site";
import type { Oportunidade } from "./types";

/**
 * Texto pronto para colar no WhatsApp (canal/comunidade) junto com a foto
 * principal do anúncio. O WhatsApp não renderiza HTML, então o card visual
 * da Central não é o que é compartilhado — o operador copia este texto e
 * a foto separadamente. O link da página própria substitui a linha de
 * contato solta (WhatsApp do vendedor / link da OLX) — quem recebe já vê
 * essa informação dentro da página.
 */
export function gerarTextoCompartilhamento(oportunidade: Oportunidade): string {
  const rotulo = oportunidade.classificacao
    ? ROTULO_CLASSIFICACAO[oportunidade.classificacao as Classificacao]
    : null;

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
    `🔗 ${urlOportunidade(oportunidade)}`,
  ];

  return linhas.filter((linha) => linha !== null).join("\n");
}
