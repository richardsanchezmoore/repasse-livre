import type { Metadata } from "next";
import "./globals.css";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
