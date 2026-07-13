import type { Metadata } from "next";
import { CapturaDestino } from "@/components/CapturaDestino";
import { PaginaVendas } from "@/components/PaginaVendas";
import { fonteTitulo, fonteCorpo } from "@/components/fontesVendas";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

// Variante A/B da landing ("vantagem competitiva" — FOMO). MESMO layout (design
// Premium Escuro), só o copy muda (variante="fomo" no PaginaVendas). noindex pra
// não competir com a /planos no Google.
export const metadata: Metadata = {
  title: "Repasse Livre PRO — chegue primeiro nas oportunidades abaixo da FIPE",
  description:
    "Enquanto outros procuram carros, os assinantes do Repasse Livre encontram oportunidades. O BIA monitora milhares de anúncios e entrega inteligência pra quem compra primeiro.",
  robots: { index: false, follow: true },
};

export default async function PlanosSlimPage({
  searchParams,
}: {
  searchParams: Promise<{ assinatura?: string }>;
}) {
  const { assinatura } = await searchParams;
  const [usuario, preco, precoAncora, whatsappSuporte, ofertaDemo, kpis, caktoUrl, gatewayAtivo] = await Promise.all([
    obterUsuarioAtual(),
    buscarPrecoExibicao(),
    buscarPrecoAncora(),
    buscarWhatsappSuporte(),
    buscarOfertaDemo(),
    buscarKpisTopo(),
    buscarCaktoCheckoutUrl(),
    buscarGatewayAtivo(),
  ]);

  const checkoutUrl =
    gatewayAtivo === "cakto" && caktoUrl
      ? usuario
        ? `${caktoUrl}${caktoUrl.includes("?") ? "&" : "?"}sck=${usuario.id}`
        : caktoUrl
      : null;
  const gerenciarUrl = whatsappSuporte
    ? `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent("Olá! Quero gerenciar minha assinatura do Repasse Livre PRO.")}`
    : null;

  const abaixoFipeVivo = kpis.abaixoFipe >= 1000 ? Math.floor(kpis.abaixoFipe / 500) * 500 : null;

  const expiraMs = usuario?.premiumExpiraEm ? new Date(usuario.premiumExpiraEm).getTime() : 0;
  const assinaturaAtiva =
    (usuario?.assinaturaStatus === "active" || usuario?.assinaturaStatus === "trialing") && expiraMs > Date.now();
  const estado: "assinar" | "gerenciar" = assinaturaAtiva ? "gerenciar" : "assinar";

  const descontoPct =
    precoAncora && precoAncora.centavos > preco.centavos
      ? Math.round((1 - preco.centavos / precoAncora.centavos) * 100)
      : null;

  return (
    <main className={`fv-raiz ${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <CapturaDestino />
      <PaginaVendas
        dados={{
          variante: "fomo",
          precoValor: preco.valor,
          precoIntervalo: preco.intervalo,
          precoAncoraTexto: precoAncora?.texto ?? null,
          descontoPct,
          kpiAoVivo: abaixoFipeVivo,
          ofertaDemo,
          checkoutUrl,
          gerenciarUrl,
          estado,
          jaPremium: Boolean(usuario?.premium),
          whatsappSuporte,
          gateway: gatewayAtivo,
          aviso: assinatura === "sucesso" ? "sucesso" : assinatura === "cancelado" ? "cancelado" : null,
        }}
      />
    </main>
  );
}
