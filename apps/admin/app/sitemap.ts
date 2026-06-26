import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { URL_BASE_SITE, urlCidade, urlOportunidade } from "@/lib/site";
import { gerarSlugCidade } from "@/lib/slug";
import type { Oportunidade } from "@/lib/types";

export const revalidate = 3600;

const TAMANHO_PAGINA = 1000;

type LinhaSitemap = Pick<
  Oportunidade,
  "id" | "veiculo" | "versao" | "ano" | "cidade" | "estado" | "origem_tipo" | "data_captura"
>;

// O Supabase (PostgREST) tem um teto de "Max Rows" (1000 por padrão) que
// ignora silenciosamente um .limit() maior — nunca dá erro, só corta sem
// avisar. Por isso busca em páginas de 1000 até não vir mais nada, em vez
// de confiar num único .limit(50000).
async function buscarTodasOportunidadesAprovadas(): Promise<LinhaSitemap[]> {
  const linhas: LinhaSitemap[] = [];

  for (let pagina = 0; ; pagina++) {
    const inicio = pagina * TAMANHO_PAGINA;
    const { data } = await supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, versao, ano, cidade, estado, origem_tipo, data_captura")
      .eq("status", "aprovada")
      .order("data_captura", { ascending: false })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);

    if (!data || data.length === 0) break;
    linhas.push(...data);
    if (data.length < TAMANHO_PAGINA) break;
  }

  return linhas;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await buscarTodasOportunidadesAprovadas();

  const oportunidades: MetadataRoute.Sitemap = data.map((oportunidade) => ({
    url: urlOportunidade(oportunidade),
    lastModified: oportunidade.data_captura,
    changeFrequency: "daily",
  }));

  const cidadesVistas = new Set<string>();
  const cidades: MetadataRoute.Sitemap = [];
  for (const oportunidade of data) {
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
