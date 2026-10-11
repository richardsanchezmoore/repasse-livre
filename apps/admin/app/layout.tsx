import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { RodapeGlobal } from "@/components/RodapeGlobal";
import { buscarConfigRastreio } from "@/lib/rastreio";
import { URL_BASE_SITE } from "@/lib/site";

/**
 * ⚠⚠ O TÍTULO PADRÃO É A REDE DE SEGURANÇA, e ele estava em PORTUGUÊS falando
 * de FIPE num site paraguaio. A home tem título próprio (vem de `seo_paginas`,
 * mig 0095), mas toda página SEM metadata cai aqui — login, cadastro, conta —
 * e era isso que o Gustavo via na aba do navegador.
 *
 * ★ Espanhol, porque a raiz do site é espanhol. A versão `/pt` de cada página
 * define o próprio título; o que não define, cai no idioma da praça.
 */
const TITULO_PADRAO = "AutoRadarPy — Precios reales de autos usados en Paraguay";
const DESCRICAO_PADRAO =
  "La tabla de precios de referencia del mercado paraguayo, por marca, modelo y año, sobre los anuncios reales publicados en Paraguay.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE_SITE),
  title: {
    default: TITULO_PADRAO,
    template: "%s — AutoRadarPy",
  },
  description: DESCRICAO_PADRAO,
  // Verificação de domínio da Meta (Business → Domains): renderiza
  // <meta name="facebook-domain-verification" ...> na home. Sem CNPJ; habilita
  // priorizar eventos de conversão e proteger a atribuição do domínio.
  other: { "facebook-domain-verification": "0doqej8v7fv7obztet61o2dzboyttj" },
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

  // ⚠️ `es` porque a raiz do site é espanhol. Só o root layout pode definir
  // <html>, então /pt herda este valor — incorreto, mas de baixo impacto: o
  // Google usa hreflang e o CONTEÚDO para decidir idioma, não este atributo.
  // Corrigir exigiria mover tudo para app/[idioma]/ (ver lib/idioma.ts).
  return (
    <html lang="es">
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

        {/* Rodapé global — se esconde sozinho no auth/legais/painel (ver RodapeGlobal). */}
        <RodapeGlobal />

        {/* beforeInteractive (só permitido no root layout) faz o Next injetar
            este script no <head>, antes de qualquer outro JS — é o que a
            Google pede ("o mais alto possível no <head>"). afterInteractive
            carregaria só depois da página ficar interativa, tarde demais
            pra capturar visitantes que saem rápido. */}
        {rastreio.gtm_id && (
          <Script id="gtm" strategy="beforeInteractive">
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
