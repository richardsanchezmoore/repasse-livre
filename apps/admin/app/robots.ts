import type { MetadataRoute } from "next";
import { URL_BASE_SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/usuarios", "/enviar", "/login", "/cadastro", "/redefinir-senha", "/auth", "/api", "/worker"],
      },
    ],
    sitemap: `${URL_BASE_SITE}/sitemap.xml`,
  };
}
