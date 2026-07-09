import type { MetadataRoute } from "next";
import { ROTAS_PAINEL_ADMIN } from "@/lib/painelAdmin";
import { URL_BASE_SITE } from "@/lib/site";

// Páginas logadas/de fluxo que não são do painel admin (route group
// (painel)), mas também não são conteúdo público indexável.
// /bia = área PRO (inteligência de mercado), gated + noindex — cobre /bia e /bia/tendencias.
const ROTAS_LOGADAS_NAO_INDEXAVEIS = ["/enviar", "/login", "/cadastro", "/redefinir-senha", "/auth", "/bia"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", ...ROTAS_LOGADAS_NAO_INDEXAVEIS, ...ROTAS_PAINEL_ADMIN],
      },
    ],
    sitemap: `${URL_BASE_SITE}/sitemap.xml`,
  };
}
