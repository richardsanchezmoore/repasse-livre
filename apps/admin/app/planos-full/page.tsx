import type { Metadata } from "next";
import { CapturaDestino } from "@/components/CapturaDestino";
import { PaginaVendas } from "@/components/PaginaVendas";
import { fonteTitulo, fonteCorpo } from "@/components/fontesVendas";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarTictoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

export const metadata: Metadata = {
  title: "Repasse Livre PRO — inteligência de mercado pra comprar abaixo da FIPE",
  description:
    "Enquanto outros procuram carros, você encontra oportunidades. O Repasse Livre monitora OLX, Webmotors, Mercado Livre e Facebook, identifica o que está abaixo da FIPE e entrega análise pronta — pra você comprar melhor e aumentar sua margem.",
  // ARQUIVO da versão LONGA (era o conteúdo original da /planos). noindex: é variante de
  // A/B / campanha, não pode competir no orgânico com a /planos. Ver a memória de campanhas.
  robots: { index: false, follow: false },
};

/**
 * ★ CÓPIA FIEL da /planos LONGA (PaginaVendas). Preservada aqui quando a /planos passou a
 * servir o conteúdo enxuto (ex-/planos-slim). Estática (ISR), mesmo desenho da /planos —
 * ver o comentário extenso lá. Serve pra teste A/B contra as variantes mais curtas.
 */
export const revalidate = 900;

export default async function PlanosFullPage() {
  const [preco, precoAncora, whatsappSuporte, ofertaDemo, kpis, caktoUrl, tictoUrl, gatewayAtivo] = await Promise.all([
    buscarPrecoExibicao(),
    buscarPrecoAncora(),
    buscarWhatsappSuporte(),
    buscarOfertaDemo(),
    buscarKpisTopo(),
    buscarCaktoCheckoutUrl(),
    buscarTictoCheckoutUrl(),
    buscarGatewayAtivo(),
  ]);

  // Vai SEM `sck` — a página é estática. O AcaoAssinatura anexa no cliente (`sck={user_id}`
  // pro logado; token de claim pro guest). Ver /planos.
  const urlHospedada = gatewayAtivo === "cakto" ? caktoUrl : gatewayAtivo === "ticto" ? tictoUrl : null;
  const checkoutUrl = urlHospedada;
  const gerenciarUrl = whatsappSuporte
    ? `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent("Olá! Quero gerenciar minha assinatura do Repasse Livre PRO.")}`
    : null;

  const abaixoFipeVivo = kpis.abaixoFipe >= 1000 ? Math.floor(kpis.abaixoFipe / 500) * 500 : null;

  const descontoPct =
    precoAncora && precoAncora.centavos > preco.centavos
      ? Math.round((1 - preco.centavos / precoAncora.centavos) * 100)
      : null;

  return (
    <main className={`fv-raiz ${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <CapturaDestino />
      <PaginaVendas
        dados={{
          variante: "padrao",
          precoValor: preco.valor,
          precoIntervalo: preco.intervalo,
          precoAncoraTexto: precoAncora?.texto ?? null,
          descontoPct,
          kpiAoVivo: abaixoFipeVivo,
          ofertaDemo,
          checkoutUrl,
          gerenciarUrl,
          whatsappSuporte,
          gateway: gatewayAtivo,
        }}
      />
    </main>
  );
}
