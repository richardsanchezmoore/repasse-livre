import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { URL_BASE_SITE, urlCidade, urlOportunidade } from "@/lib/site";
import { gerarSlugCidade } from "@/lib/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabaseAdmin
    .from("opportunities")
    .select("id, veiculo, versao, ano, cidade, estado, origem_tipo, data_captura")
    .eq("status", "aprovada")
    .order("data_captura", { ascending: false })
    .limit(50000);

  const oportunidades: MetadataRoute.Sitemap = (data ?? []).map((oportunidade) => ({
    url: urlOportunidade(oportunidade),
    lastModified: oportunidade.data_captura,
    changeFrequency: "daily",
  }));

  const cidadesVistas = new Set<string>();
  const cidades: MetadataRoute.Sitemap = [];
  for (const oportunidade of data ?? []) {
    const slugCidade = gerarSlugCidade(oportunidade);
    if (slugCidade === "sem-localizacao" || cidadesVistas.has(slugCidade)) continue;
    cidadesVistas.add(slugCidade);
    cidades.push({
      url: urlCidade(oportunidade),
      lastModified: oportunidade.data_captura,
      changeFrequency: "daily",
    });
  }

  return [
    {
      url: URL_BASE_SITE,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...cidades,
    ...oportunidades,
  ];
}
