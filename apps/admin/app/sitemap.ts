import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { URL_BASE_SITE, PAIS_DO_SITE, urlCidade, urlEstado, urlMarca, urlModelo, urlOportunidade } from "@/lib/site";
import { extrairMarca, extrairModeloSeo } from "@/lib/marca";
import { MIN_ANUNCIOS_MODELO } from "@/components/DiscoveriesBoard";
import { gerarSlugCidade, slugify } from "@/lib/slug";
import { listarPostsPublicados } from "@/lib/cms";
import type { Oportunidade } from "@/lib/types";

export const revalidate = 3600;

const TAMANHO_PAGINA = 1000;

// ★★ SÓ O PAÍS VIVO É ANUNCIADO AO BUSCADOR (02/10/2026).
//
// O que motivou: a conta do Supabase estourou o egress (5,47 de 5 GB) com DOIS
// usuários ativos no mês. Não era gente, era robô — e o sitemap é o convite.
// Medido na base: das oportunidades aprovadas, 934 são BR e 66 são PY. Ou seja,
// 93% do que o buscador rastreava todo dia era estoque brasileiro da era
// Repasse Livre, que não serve mais ao produto.
//
// ⚠️ O CORTE NÃO PODE SER POR DOMÍNIO. O Auto Radar PY roda HOJE no próprio
// repasselivre.com (a troca para autoradarpy.com vem depois) — eu quase
// desindexei o site vivo tentando separar pelo domínio. Quem separa é o DADO.
//
// ⚠️ NÃO APAGA NADA. As 934 brasileiras continuam na base e no painel; só param
// de ser anunciadas. Se o Brasil voltar, troca a env — mesma lógica do
// "desligar por flag, não apagar" que já vale para Webmotors e OLX.
// (PAIS_DO_SITE vem de lib/site.ts — fonte única, usada também pelo noindex
// das páginas da era anterior.)

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
      .eq("pais", PAIS_DO_SITE)
      // ⚠️⚠️ AS MESMAS TRÊS CONDIÇÕES DA VITRINE — e faltavam aqui (13/10/2026).
      //
      // O sitemap anunciava ao Google tudo que estava "aprovada", enquanto a
      // listagem esconde reanúncio, anúncio sem foto e anúncio sem cidade. Com
      // 865 reanúncios marcados na base, o convite ao robô incluía centenas de
      // páginas do MESMO carro — exatamente o que o motor de duplicata existe
      // para evitar — mais as que o site nem mostra.
      //
      // ⚠️ E o custo não é só de SEO: rastreador é quem estourou o egress do
      // Supabase em 02/10, e o sitemap é o convite.
      .is("duplicata_de", null)
      .not("foto_principal", "is", null)
      .not("cidade", "is", null)
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
  // Modelo (nível abaixo de marca) — só entra no sitemap com VOLUME (>= gate),
  // senão vira página fina. Conta por (estado|cidade):marca:modelo e emite depois.
  const modeloEstado = new Map<string, { url: string; lastModified?: string; n: number }>();
  const modeloCidade = new Map<string, { url: string; lastModified?: string; n: number }>();

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

    const modelo = extrairModeloSeo(oportunidade.veiculo);
    if (modelo) {
      const slugModelo = slugify(modelo);
      if (oportunidade.estado) {
        const chave = `${oportunidade.estado}:${slugMarca}:${slugModelo}`;
        const reg = modeloEstado.get(chave);
        if (reg) reg.n++;
        else
          modeloEstado.set(chave, {
            url: urlModelo({ estado: oportunidade.estado }, marca, modelo),
            lastModified: oportunidade.data_captura ?? undefined,
            n: 1,
          });
      }
      if (oportunidade.cidade && oportunidade.estado) {
        const chave = `${slugCidade}:${slugMarca}:${slugModelo}`;
        const reg = modeloCidade.get(chave);
        if (reg) reg.n++;
        else
          modeloCidade.set(chave, {
            url: urlModelo({ cidade: oportunidade.cidade, estado: oportunidade.estado }, marca, modelo),
            lastModified: oportunidade.data_captura ?? undefined,
            n: 1,
          });
      }
    }
  }

  // Só modelos com volume (>= gate) — evita encher o sitemap de página fina.
  const modelos: MetadataRoute.Sitemap = [...modeloEstado.values(), ...modeloCidade.values()]
    .filter((m) => m.n >= MIN_ANUNCIOS_MODELO)
    .map((m) => ({ url: m.url, lastModified: m.lastModified, changeFrequency: "daily" as const }));

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

  /**
   * ★★ HREFLANG NO SITEMAP — entrou em 13/10/2026, junto com a /tabla.
   *
   * O site tem duas versões server-rendered (espanhol na raiz, português em
   * /pt) e o sitemap anunciava só a primeira. Sem `alternates`, o Google trata
   * as duas como páginas concorrentes pelo mesmo assunto em vez de traduções
   * uma da outra — que é precisamente o problema de indexação que a estrutura
   * por CAMINHO foi desenhada para evitar. Anunciar só o espanhol jogava fora
   * metade do trabalho.
   *
   * ⚠️ `x-default` aponta para a RAIZ: é a versão da praça.
   */
  const comIdiomas = (url: string) => ({
    languages: { es: url, pt: `${URL_BASE_SITE}/pt${url.slice(URL_BASE_SITE.length)}`, "x-default": url },
  });

  return [
    {
      url: URL_BASE_SITE,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
      alternates: comIdiomas(URL_BASE_SITE),
    },
    /**
     * ★★★ A TABELA É O PRODUTO e não estava no sitemap.
     *
     * É a página que a tese inteira sustenta — "no Paraguai não existe FIPE,
     * então nós criamos a referência" — e o buscador não sabia que ela existe.
     * Prioridade logo abaixo da home, e `weekly` porque a tabela é datada por
     * mês: dizer "hourly" seria pedir rastreio que não muda nada.
     */
    {
      url: `${URL_BASE_SITE}/tabla`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: comIdiomas(`${URL_BASE_SITE}/tabla`),
    },
    ...blog,
    ...estados,
    ...cidades,
    ...marcasNacional,
    ...marcasEstado,
    ...marcasCidade,
    ...modelos,
    ...oportunidades,
  ];
}
