import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  buscarEstadosDisponiveis,
  buscarIdsFavoritados,
  buscarMarcaPorSlug,
  buscarOportunidadePorId,
  contarOportunidades,
  ITENS_POR_PAGINA,
} from "@/components/DiscoveriesBoard";
import { BreadcrumbOportunidade } from "@/components/BreadcrumbOportunidade";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { OfertasRelacionadas } from "@/components/OfertasRelacionadas";
import { OpportunityCard } from "@/components/OpportunityCard";
import { PaginaOportunidade } from "@/components/PaginaOportunidade";
import { RegistradorVisualizacao } from "@/components/RegistradorVisualizacao";
import { gerarFactSheet } from "@/lib/bia/dados";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { buscarMargemPremium } from "@/lib/configWorker";
import { resolverLocalidade } from "@/lib/localidade";
import { extrairMarca } from "@/lib/marca";
import { redirecionarOuNotFound } from "@/lib/redirecionamentos";
import { buscarConfigSeo, buscarFotoDestaque, substituirVariaveisSeo } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { caminhoMarca, caminhoOportunidade, urlMarca, urlOportunidade } from "@/lib/site";
import { extrairIdDaSlug } from "@/lib/slug";
import type { Oportunidade } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Segundo segmento de /carros/{cidadeUf}/{slug} é o produto (slug termina
// em uuid) ou, se não terminar em uuid, a marca dentro daquela localidade
// (ex.: /carros/sao-paulo-sp/volkswagen). Mesmo arquivo de rota cobre os
// dois casos pra evitar conflito de rota dinâmica no Next.js.

async function gerarMetadataMarca(cidadeUf: string, marcaSlug: string): Promise<Metadata> {
  const localidade = await resolverLocalidade(cidadeUf);
  if (!localidade) return {};

  const marcaResolvida = await buscarMarcaPorSlug(
    { cidade: localidade.filtroCidade, estado: localidade.filtroEstado },
    marcaSlug
  );
  if (!marcaResolvida) return {};

  const url = urlMarca({ cidade: localidade.filtroCidade ?? null, estado: localidade.filtroEstado }, marcaResolvida.marca);
  const variaveis: Record<string, string> =
    localidade.chaveSeo === "cidade"
      ? { tag: marcaResolvida.marca, cidade: localidade.nome }
      : { tag: marcaResolvida.marca, estado: localidade.nome };

  let titulo = `${marcaResolvida.marca} — Carros abaixo da FIPE em ${localidade.nome}`;
  let descricao = `Oportunidades de ${marcaResolvida.marca} abaixo da tabela FIPE em ${localidade.nome}.`;

  const [config, foto] = await Promise.all([
    buscarConfigSeo("marca"),
    buscarFotoDestaque({ cidade: localidade.filtroCidade, estado: localidade.filtroEstado, marca: marcaResolvida.marca }),
  ]);
  if (config?.titulo) titulo = substituirVariaveisSeo(config.titulo, variaveis);
  if (config?.descricao) descricao = substituirVariaveisSeo(config.descricao, variaveis);

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: descricao, url, images: foto ? [foto] : undefined },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: foto ? [foto] : undefined },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidadeUf: string; slug: string }>;
}): Promise<Metadata> {
  const { cidadeUf, slug } = await params;
  const id = extrairIdDaSlug(slug);

  if (!id) {
    return gerarMetadataMarca(cidadeUf, slug);
  }

  const oportunidade = await buscarOportunidadePorId(id);
  if (!oportunidade) return {};

  const tituloAd =
    oportunidade.origem_tipo === "insercao_direta" && oportunidade.versao
      ? oportunidade.versao
      : oportunidade.veiculo;
  const descricaoAd = `${oportunidade.margem_percentual?.toFixed(1)}% abaixo da FIPE — ${
    oportunidade.cidade ?? ""
  } ${oportunidade.estado ?? ""}`.trim();
  const marcaAnuncio = extrairMarca(tituloAd);

  const variaveis: Record<string, string> = {
    title_ad: tituloAd,
    description_ad: descricaoAd,
    ...(marcaAnuncio ? { tag: marcaAnuncio } : {}),
    ...(oportunidade.cidade ? { cidade: `${oportunidade.cidade} ${oportunidade.estado ?? ""}`.trim() } : {}),
    ...(oportunidade.estado ? { estado: oportunidade.estado } : {}),
  };

  const config = await buscarConfigSeo("produto");
  const titulo = config?.titulo ? substituirVariaveisSeo(config.titulo, variaveis) : tituloAd;
  const descricao = config?.descricao ? substituirVariaveisSeo(config.descricao, variaveis) : descricaoAd;

  return {
    title: titulo,
    description: descricao,
    alternates: {
      canonical: urlOportunidade(oportunidade),
    },
    openGraph: {
      title: titulo,
      description: descricao,
      url: urlOportunidade(oportunidade),
      images: oportunidade.foto_principal ? [oportunidade.foto_principal] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: oportunidade.foto_principal ? [oportunidade.foto_principal] : [],
    },
  };
}

async function PaginaMarca({
  cidadeUf,
  marcaSlug,
  pagina,
}: {
  cidadeUf: string;
  marcaSlug: string;
  pagina: number;
}) {
  const localidade = await resolverLocalidade(cidadeUf);
  if (!localidade) {
    // Localidade inválida — sem filtro de marca pra cair, sobe pro nível
    // mais alto possível (a própria página da localidade decide a partir
    // daí, inclusive usando o catch-all se nem ela existir mais).
    await redirecionarOuNotFound(`/carros/${cidadeUf}/${marcaSlug}`, { fallback: `/carros/${cidadeUf}` });
    return null;
  }

  const marcaResolvida = await buscarMarcaPorSlug(
    { cidade: localidade.filtroCidade, estado: localidade.filtroEstado },
    marcaSlug
  );
  if (!marcaResolvida) {
    // Marca não existe (mais) nessa localidade — cai pra ela sem o filtro,
    // em vez de mostrar 404 pra uma marca que pode ter saído de cena.
    await redirecionarOuNotFound(`/carros/${cidadeUf}/${marcaSlug}`, { fallback: `/carros/${cidadeUf}` });
    return null;
  }

  const usuario = await obterUsuarioAtual();
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA - 1;

  let consulta = supabaseAdmin
    .from("opportunities")
    .select("*", { count: "exact" })
    .eq("status", "aprovada")
    .eq("estado", localidade.filtroEstado)
    .ilike("veiculo", `${marcaResolvida.marca}%`);
  if (localidade.filtroCidade) {
    consulta = consulta.eq("cidade", localidade.filtroCidade);
  }
  consulta = consulta
    .order("data_ordenacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(inicio, fim);

  const [{ data, count, error }, contagens, estadosDisponiveis] = await Promise.all([
    consulta,
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
  ]);

  if (error) {
    throw new Error(`Falha ao buscar oportunidades da marca: ${error.message}`);
  }

  const oportunidades = (data ?? []) as Oportunidade[];
  const idsFavoritados = usuario ? await buscarIdsFavoritados(usuario.id) : new Set<string>();
  // Gate premium (mesmo critério do DiscoveriesBoard) — trava as ofertas gordas
  // também nesta página SEO pública, senão o funil vaza por aqui.
  const ehAdmin = usuario?.role === "admin";
  const margemPremium = !ehAdmin && !usuario?.premium ? await buscarMargemPremium() : Infinity;
  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const caminhoAtual = caminhoMarca(
    { cidade: localidade.filtroCidade ?? null, estado: localidade.filtroEstado },
    marcaResolvida.marca
  );

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar
            abaAtiva="aprovadas"
            contagens={contagens}
            role={usuario?.role ?? null}
            usuarioLogado={Boolean(usuario)}
          />
          <main className="conteudo">
            <section className="board">
              <header className="board-header">
                <div className="board-header-titulo">
                  <span className="contador">{total}</span>
                  <h1>
                    {marcaResolvida.marca} em {localidade.nome}
                  </h1>
                </div>
              </header>
              <div className="board-lista">
                {oportunidades.length === 0 && <p className="vazio">Nenhuma oportunidade aqui.</p>}
                {oportunidades.map((oportunidade) => (
                  <OpportunityCard
                    key={oportunidade.id}
                    oportunidade={oportunidade}
                    favoritado={idsFavoritados.has(oportunidade.id)}
                    isAdmin={ehAdmin}
                    usuarioLogado={Boolean(usuario)}
                    bloqueado={(oportunidade.margem_percentual ?? 0) > margemPremium}
                  />
                ))}
              </div>
              {totalPaginas > 1 && (
                <nav className="paginacao" aria-label="Paginação">
                  {pagina > 1 && (
                    <Link href={`${caminhoAtual}?pagina=${pagina - 1}`} className="paginacao-seta">
                      ←
                    </Link>
                  )}
                  <span className="paginacao-item paginacao-item-ativo">
                    {pagina} / {totalPaginas}
                  </span>
                  {pagina < totalPaginas && (
                    <Link href={`${caminhoAtual}?pagina=${pagina + 1}`} className="paginacao-seta">
                      →
                    </Link>
                  )}
                </nav>
              )}
            </section>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}

export default async function PaginaOportunidadeOuMarcaRoute({
  params,
  searchParams,
}: {
  params: Promise<{ cidadeUf: string; slug: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { cidadeUf, slug } = await params;
  const id = extrairIdDaSlug(slug);

  if (!id) {
    const { pagina: paginaParam } = await searchParams;
    return <PaginaMarca cidadeUf={cidadeUf} marcaSlug={slug} pagina={Math.max(1, Number(paginaParam) || 1)} />;
  }

  const usuario = await obterUsuarioAtual();
  // Admin pode abrir a página de anúncios ainda em Descobertas (não aprovados)
  // pra revisar detalhes/fotos antes de aprovar; público só vê aprovados.
  const oportunidade = await buscarOportunidadePorId(id, usuario?.role === "admin");

  if (!oportunidade) {
    // Anúncio apagado/rejeitado (um a um ou em massa) — cai pra página da
    // cidade em vez de 404, sem precisar cadastrar um redirecionamento pra
    // cada anúncio removido.
    await redirecionarOuNotFound(`/carros/${cidadeUf}/${slug}`, { fallback: `/carros/${cidadeUf}` });
    return null;
  }

  // Link com cidade/slug desatualizado (anúncio editado, cidade mudou etc.)
  // — redireciona pra forma canônica em vez de servir conteúdo duplicado em
  // duas URLs.
  const caminhoCanonico = caminhoOportunidade(oportunidade);
  if (`/carros/${cidadeUf}/${slug}` !== caminhoCanonico) {
    permanentRedirect(caminhoCanonico);
  }

  const [contagens, estadosDisponiveis] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
  ]);

  const titulo =
    oportunidade.origem_tipo === "insercao_direta" && oportunidade.versao
      ? oportunidade.versao
      : oportunidade.veiculo;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: titulo,
    vehicleModelDate: oportunidade.ano ?? undefined,
    mileageFromOdometer: oportunidade.km
      ? { "@type": "QuantitativeValue", value: oportunidade.km, unitCode: "KMT" }
      : undefined,
    image: oportunidade.foto_principal ?? undefined,
    offers: {
      "@type": "Offer",
      price: oportunidade.preco,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: urlOportunidade(oportunidade),
      areaServed: oportunidade.cidade && oportunidade.estado
        ? `${oportunidade.cidade}, ${oportunidade.estado}`
        : undefined,
    },
  };

  // Copiloto de Compra (BIA Engine) — prévia admin-only por ora; o gate Premium
  // substitui esta checagem quando os planos existirem. Recalculado na leitura.
  const factSheetBia = usuario?.role === "admin" ? await gerarFactSheet(oportunidade.id) : null;

  // Gate premium (mesmo critério do board/relacionadas) — na página individual o
  // overlay cobre o corpo (galeria fica livre pro tráfego de Ads); conteúdo fica
  // borrado no DOM, preservando SEO. Ver project_repasse_livre_premium_monetizacao.
  const ehAdminPagina = usuario?.role === "admin";
  const margemPremiumPagina =
    !ehAdminPagina && !usuario?.premium ? await buscarMargemPremium() : Infinity;
  const bloqueado = (oportunidade.margem_percentual ?? 0) > margemPremiumPagina;

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <TopBar
          aba="aprovadas"
          estadosDisponiveis={estadosDisponiveis}
          usuario={usuario}
        />
        <div className="layout">
          <Sidebar
            abaAtiva="aprovadas"
            contagens={contagens}
            role={usuario?.role ?? null}
            usuarioLogado={Boolean(usuario)}
          />
          <main className="conteudo pagina-oportunidade-conteudo">
            <div className="pagina-oportunidade-topo">
              <Link href="/" className="pagina-oportunidade-voltar">
                <ArrowLeft size={16} strokeWidth={2} /> Voltar
              </Link>
              <BreadcrumbOportunidade oportunidade={oportunidade} titulo={titulo} />
            </div>
            <RegistradorVisualizacao
              opportunityId={oportunidade.id}
              veiculo={oportunidade.veiculo}
              estado={oportunidade.estado}
            />
            <PaginaOportunidade oportunidade={oportunidade} bloqueado={bloqueado} factSheet={factSheetBia} />
            <OfertasRelacionadas oportunidade={oportunidade} usuario={usuario} />
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
