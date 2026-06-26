import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { buscarConfigRastreio } from "@/lib/rastreio";
import { URL_BASE_SITE } from "@/lib/site";

const TITULO_PADRAO = "Repasse Livre — Carros abaixo da tabela FIPE";
const DESCRICAO_PADRAO =
  "Oportunidades reais de carros à venda abaixo do valor da tabela FIPE, coletadas e atualizadas todos os dias.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE_SITE),
  title: {
    default: TITULO_PADRAO,
    template: "%s — Repasse Livre",
  },
  description: DESCRICAO_PADRAO,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Repasse Livre",
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const rastreio = await buscarConfigRastreio();

  return (
    <html lang="pt-BR">
      <body>
        {/* dangerouslySetInnerHTML aqui (em vez de filhos React normais)
            evita erro de hidratação #418/#423/#425: com JS habilitado o
            navegador trata conteúdo de <noscript> como texto puro e não
            cria o <iframe>, mas o React tentaria hidratar como se tivesse
            criado — diff trava a página inteira. */}
        {rastreio.gtm_id && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${rastreio.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        )}
        {children}

        {rastreio.gtm_id && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${rastreio.gtm_id}');`}
          </Script>
        )}

        {rastreio.ga_measurement_id && (
          <>
            <Script
              id="ga4-lib"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${rastreio.ga_measurement_id}`}
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${rastreio.ga_measurement_id}');`}
            </Script>
          </>
        )}

        {rastreio.meta_pixel_id && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${rastreio.meta_pixel_id}');fbq('track','PageView');`}
            </Script>
            <noscript
              dangerouslySetInnerHTML={{
                __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${rastreio.meta_pixel_id}&ev=PageView&noscript=1" alt="" />`,
              }}
            />
          </>
        )}

        {/* dangerouslySetInnerHTML não executa <script> — só serve pra tags
            sem JS (ex.: <noscript><img> de algum pixel). Pra rastreio com
            JS, usar os campos dedicados acima ou estender CHAVES_RASTREIO. */}
        {rastreio.scripts_extra && (
          <div
            id="scripts-extra-rastreio"
            dangerouslySetInnerHTML={{ __html: rastreio.scripts_extra }}
            suppressHydrationWarning
          />
        )}
      </body>
    </html>
  );
}
