import type { Metadata } from "next";
import { CapturaDestino } from "@/components/CapturaDestino";
import { PaginaVendas } from "@/components/PaginaVendas";
import { fonteTitulo, fonteCorpo } from "@/components/fontesVendas";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

export const metadata: Metadata = {
  title: "Repasse Livre PRO — inteligência de mercado pra comprar abaixo da FIPE",
  description:
    "Enquanto o mercado procura carros, os assinantes do Repasse Livre encontram oportunidades. O BIA monitora milhares de anúncios de OLX, Webmotors e Mercado Livre, identifica o que está abaixo da FIPE e entrega análise pra você comprar melhor e lucrar mais.",
};

export default async function PlanosPage({
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

  // Checkout da Cakto (quando é o gateway ativo). Logado → leva o user_id no sck
  // (match exato); NÃO logado → checkout direto SEM login (o webhook cria/acha a
  // conta pelo email, ou o token de claim faz o auto-login em /bem-vindo).
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
          variante: "padrao",
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
