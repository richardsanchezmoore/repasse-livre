import type { Metadata } from "next";
import { CapturaDestino } from "@/components/CapturaDestino";
import { PaginaVendasCurta } from "@/components/PaginaVendasCurta";
import { fonteTitulo, fonteCorpo } from "@/components/fontesVendas";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarTictoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

export const metadata: Metadata = {
  title: "Repasse Livre PRO — inteligência de mercado pra comprar abaixo da FIPE",
  description:
    "Enquanto outros procuram carros, você encontra oportunidades. O Repasse Livre monitora OLX, Webmotors, Mercado Livre e Facebook, identifica o que está abaixo da FIPE e entrega análise pronta — pra você comprar melhor e aumentar sua margem.",
  // Variante de teste A/B — fora do índice pra não competir com /planos (conteúdo duplicado).
  robots: { index: false, follow: false },
};

/** Estática (ISR), pelo mesmo motivo e com o mesmo desenho da /planos — ver o comentário
 *  extenso lá. Como é a variante do A/B, tem que ficar idêntica em comportamento, senão
 *  o teste compara velocidade em vez de comparar copy. */
export const revalidate = 900;

export default async function PlanosSlimPage() {
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

  // "Nossos números" (faixa escura da slim) — os MESMOS KPIs do board, formatados aqui
  // (milhar/economia são funções locais do KpisTopo.tsx, não exportadas).
  const milhar = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
  const economia =
    kpis.economia >= 1_000_000 ? `R$ ${(kpis.economia / 1_000_000).toFixed(1).replace(".", ",")} mi`
    : kpis.economia >= 10_000 ? `R$ ${Math.round(kpis.economia / 1000)} mil`
    : `R$ ${milhar(Math.round(kpis.economia))}`;
  const legNovos = kpis.novosHoras >= 168 ? `${Math.round(kpis.novosHoras / 24)} dias` : `${kpis.novosHoras}h`;
  const numeros = [
    { valor: milhar(kpis.mapeados), rotulo: `Ofertas mapeadas · ${kpis.mapeadasDias} dias` },
    { valor: milhar(kpis.abaixoFipe), rotulo: "Abaixo da FIPE" },
    { valor: milhar(kpis.novos), rotulo: `Novos · últimas ${legNovos}` },
    { valor: economia, rotulo: `Economia de mercado · ${kpis.mapeadasDias} dias` },
  ];

  return (
    <main className={`fv-raiz ${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <CapturaDestino />
      <PaginaVendasCurta
        dados={{
          variante: "padrao",
          precoValor: preco.valor,
          precoIntervalo: preco.intervalo,
          precoAncoraTexto: precoAncora?.texto ?? null,
          descontoPct,
          kpiAoVivo: abaixoFipeVivo,
          numeros,
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
