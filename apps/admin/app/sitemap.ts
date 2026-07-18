import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { URL_BASE_SITE, urlCidade, urlEstado, urlMarca, urlOportunidade } from "@/lib/site";
import { extrairMarca } from "@/lib/marca";
import { gerarSlugCidade, slugify } from "@/lib/slug";
import { listarPostsPublicados } from "@/lib/cms";
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
  const estadosVistos = new Set<string>();
  const estados: MetadataRoute.Sitemap = [];
  // Marca tem 3 níveis de URL (nacional, por estado, por cidade — ver
  // caminhoMarca em lib/site.ts), cada um deduplicado pela própria chave.
  const marcasNacionalVistas = new Set<string>();
  const marcasNacional: MetadataRoute.Sitemap = [];
  const marcasEstadoVistas = new Set<string>();
  const marcasEstado: MetadataRoute.Sitemap = [];
  const marcasCidadeVistas = new Set<string>();
  const marcasCidade: MetadataRoute.Sitemap = [];

  for (const oportunidade of data) {
    const slugCidade = gerarSlugCidade(oportunidade);
    if (slugCidade !== "sem-localizacao" && !cidadesVistas.has(slugCidade)) {
      cidadesVistas.add(slugCidade);
      cidades.push({
        url: urlCidade(oportunidade),
        lastModified: oportunidade.data_captura,
        changeFrequency: "daily",
      });
    }

    if (oportunidade.estado && !estadosVistos.has(oportunidade.estado)) {
      estadosVistos.add(oportunidade.estado);
      estados.push({
        url: urlEstado(oportunidade.estado),
        lastModified: oportunidade.data_captura,
        changeFrequency: "daily",
      });
    }

    const marca = extrairMarca(oportunidade.veiculo);
    if (!marca) continue;
    const slugMarca = slugify(marca);

    if (!marcasNacionalVistas.has(slugMarca)) {
      marcasNacionalVistas.add(slugMarca);
      marcasNacional.push({
        url: urlMarca({}, marca),
        lastModified: oportunidade.data_captura,
        changeFrequency: "daily",
      });
    }

    if (oportunidade.estado) {
      const chaveEstadoMarca = `${oportunidade.estado}:${slugMarca}`;
      if (!marcasEstadoVistas.has(chaveEstadoMarca)) {
        marcasEstadoVistas.add(chaveEstadoMarca);
        marcasEstado.push({
          url: urlMarca({ estado: oportunidade.estado }, marca),
          lastModified: oportunidade.data_captura,
          changeFrequency: "daily",
        });
      }
    }

    if (oportunidade.cidade && oportunidade.estado) {
      const chaveCidadeMarca = `${slugCidade}:${slugMarca}`;
      if (!marcasCidadeVistas.has(chaveCidadeMarca)) {
        marcasCidadeVistas.add(chaveCidadeMarca);
        marcasCidade.push({
          url: urlMarca({ cidade: oportunidade.cidade, estado: oportunidade.estado }, marca),
          lastModified: oportunidade.data_captura,
          changeFrequency: "daily",
        });
      }
    }
  }

  // Blog: a listagem + cada post publicado.
  const posts = await listarPostsPublicados();
  const blog: MetadataRoute.Sitemap = [
    { url: `${URL_BASE_SITE}/blog`, changeFrequency: "weekly" },
    ...posts.map((p) => ({
      url: `${URL_BASE_SITE}/blog/${p.slug}`,
      lastModified: p.publicadoEm ?? undefined,
      changeFrequency: "monthly" as const,
    })),
  ];

  return [
    {
      url: URL_BASE_SITE,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...blog,
    ...estados,
    ...cidades,
    ...marcasNacional,
    ...marcasEstado,
    ...marcasCidade,
    ...oportunidades,
  ];
}
