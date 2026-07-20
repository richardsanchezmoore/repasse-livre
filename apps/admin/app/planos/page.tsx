import type { Metadata } from "next";
import { CapturaDestino } from "@/components/CapturaDestino";
import { PixelViewContent } from "@/components/PixelViewContent";
import { PaginaVendasSlim } from "@/components/PaginaVendasSlim";
import { fonteTitulo, fonteCorpo } from "@/components/fontesVendas";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarTictoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

export const metadata: Metadata = {
  title: "Repasse Livre PRO — inteligência de mercado pra comprar abaixo da FIPE",
  description:
    "Enquanto outros procuram carros, você encontra oportunidades. O Repasse Livre monitora OLX, Webmotors, Mercado Livre e Facebook, identifica o que está abaixo da FIPE e entrega análise pronta — pra você comprar melhor e aumentar sua margem.",
};

/**
 * ★ PÁGINA ESTÁTICA (ISR). Antes era dinâmica SEM `force-dynamic`: bastavam o
 * `searchParams` e o `obterUsuarioAtual()` pra tirar a rota do estático — e aí as 719
 * linhas do PaginaVendas renderizavam no servidor A CADA VISITA. Medido no Observability:
 * 1.9K invocações e ~28% de toda a Active CPU da conta, só nesta página.
 *
 * Isso importa menos pelo custo (Active CPU no Pro é ~$0,13/h) e mais pela VELOCIDADE:
 * é a página que recebe o tráfego PAGO, e TTFB alto derruba conversão. Servida do CDN,
 * o primeiro byte não espera render nem banco.
 *
 * Como a personalização foi preservada (nada aqui depende mais de quem é o visitante):
 *  · `sck` do logado + rótulo assinar/gerenciar → AcaoAssinatura no modo "auto" (lê a
 *    sessão no cliente, direto do Supabase, sem passar por função da Vercel).
 *  · `?assinatura=sucesso|cancelado` → AvisoAssinatura (useSearchParams no cliente).
 *  · O guest segue no token de claim, caminho JÁ validado ponta a ponta.
 * ⚠️ O retorno da TICTO com troca de token NÃO é aqui — é a /bem-vindo, que continua
 * force-dynamic de propósito. Ver project_repasse_livre_gateway_pagamento_woovi.
 *
 * 900s = o mesmo passo do cache do KPI (kpis_topo já é cacheada 15min), então o número
 * "ao vivo" não fica mais velho do que já ficava.
 */
export const revalidate = 900;

export default async function PlanosPage() {
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

  // Checkout hospedado (Cakto OU Ticto — mesmo padrão de link + sck). Vai SEM `sck`:
  // a página é estática e não sabe quem é o visitante. Quem anexa é o AcaoAssinatura
  // no cliente — `sck={user_id}` pro logado (match exato), token de claim pro guest.
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
      <PixelViewContent nome="planos" />
      <PaginaVendasSlim
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
