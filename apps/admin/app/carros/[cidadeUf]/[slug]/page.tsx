import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gem } from "lucide-react";
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
import { PonteAssinatura } from "@/components/PonteAssinatura";
import { BarraPonteScroll } from "@/components/BarraPonteScroll";
import { RastreioEvento } from "@/components/RastreioEvento";
import { RegistradorVisualizacao } from "@/components/RegistradorVisualizacao";
import { gerarFactSheet } from "@/lib/bia/dados";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { buscarMargemPremium, buscarIdsLiberados } from "@/lib/configWorker";
import { resumirParecer, semParecer } from "@/lib/copilotoResumo";
import { resolverLocalidade } from "@/lib/localidade";
import { extrairMarca } from "@/lib/marca";
import { redirecionarOuNotFound } from "@/lib/redirecionamentos";
import { buscarConfigSeo, buscarFotoDestaque, substituirVariaveisSeo } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { caminhoMarca, caminhoOportunidade, urlMarca, urlOportunidade } from "@/lib/site";
import { buscarSeoTexto, textoSeoFallback } from "@/lib/seoTexto";
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

  const oportunidades = semParecer((data ?? []) as Oportunidade[]);
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
  // Parágrafo de SEO (prosa única gerada em batch; template como fallback).
  const ctxSeo = { tipo: "marca" as const, localidade: localidade.nome, marca: marcaResolvida.marca, total };
  const textoSeo =
    (await buscarSeoTexto("marca", `${cidadeUf}:${marcaSlug}`)) ?? textoSeoFallback(ctxSeo);

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
                <p className="board-seo-texto">{textoSeo}</p>
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
  searchParams: Promise<{ pagina?: string; embed?: string }>;
}) {
  const { cidadeUf, slug } = await params;
  const { pagina: paginaParam, embed: embedParam } = await searchParams;
  const embed = embedParam === "1" || embedParam === "true";
  const id = extrairIdDaSlug(slug);

  if (!id) {
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

  // ★ ANÚNCIOS LIBERADOS = âncora (DEMO_OPPORTUNITY_ID, que alimenta o modal da
  // /planos) + campanhas (ADS_OPORTUNIDADES, os destinos dos criativos). Pra ESSES
  // ids o paywall cai (Copiloto completo + acesso) pra qualquer visitante — exceção
  // de marketing consciente: o criativo vende o CARRO, e quem clica precisa ver a
  // análise inteira pra a assinatura virar decisão lógica. Fora da lista, nada muda.
  // Fail-closed: erro de leitura/JSON → conjunto vazio, nunca "libera tudo".
  // Ver lib/configWorker (buscarIdsLiberados) + lib/ofertaDemo + /planos.
  const liberados = await buscarIdsLiberados();
  const ehDemo = liberados.has(oportunidade.id);

  const ehAdminPagina = usuario?.role === "admin";
  const podeVerCopiloto = ehAdminPagina || Boolean(usuario?.premium) || ehDemo;

  // Copiloto de Compra (BIA Engine) — item do PLANO PAGO. Só computa o fact-sheet
  // (query pesada de coorte) p/ quem PODE ver (admin/premium); o não-pago recebe
  // o teaser, que lê só o parecer já persistido (sem coorte). Isso evita pagar a
  // query no tráfego de Ads. copilotoBloqueado independe da margem (o Copiloto é
  // pago sempre, não só nas ofertas gordas).
  const factSheetBia = podeVerCopiloto ? await gerarFactSheet(oportunidade.id) : null;
  const copilotoBloqueado = !podeVerCopiloto;
  // Resumo de 2 linhas p/ o teaser + BLINDAGEM: o parecer completo NUNCA vai pro
  // cliente (BotaoCompartilharPagina e outros client comps serializam o objeto
  // inteiro no payload RSC → daria pra ler tudo via inspeção). Só o resumo passa.
  const copilotoResumo = copilotoBloqueado ? resumirParecer(oportunidade.copiloto_parecer) : null;
  oportunidade.copiloto_parecer = null;

  // Gate premium do ACESSO ao anúncio (link + WhatsApp) — na página individual só
  // esse acesso é travado (galeria/ganho/ficha ficam abertos p/ Ads e SEO); vale
  // só nas ofertas acima do limite. Ver project_repasse_livre_premium_monetizacao.
  const margemPremiumPagina =
    ehAdminPagina || usuario?.premium || ehDemo ? Infinity : await buscarMargemPremium();
  const bloqueado = (oportunidade.margem_percentual ?? 0) > margemPremiumPagina;
  const ehPremiumEfetivo = ehAdminPagina || Boolean(usuario?.premium) || ehDemo;
  // Assinante REAL — sem ehDemo de propósito: o visitante de Ads (destino liberado)
  // NÃO recebe o link externo; ganha o CTA travado → /planos-slim (não vazar pra origem).
  const ehAssinante = ehAdminPagina || Boolean(usuario?.premium);

  // Modo embed (iframe do modal "Experimente" na /planos): a MESMA página, sem o
  // menu/sidebar/relacionadas — só o anúncio, limpo, dentro do modal de vendas.
  if (embed) {
    return (
      <NavegacaoProvider>
        <SelecaoMultiplaProvider>
          <meta name="robots" content="noindex" />
          <div className="oportunidade-embed">
            {ehDemo && (
              <div className="oportunidade-embed-selo">
                <Gem size={14} strokeWidth={2} /> Oferta de demonstração — acesso liberado
              </div>
            )}
            <PaginaOportunidade
              oportunidade={oportunidade}
              bloqueado={bloqueado}
              factSheet={factSheetBia}
              copilotoBloqueado={copilotoBloqueado}
              copilotoResumo={copilotoResumo}
              ehPremium={ehPremiumEfetivo}
              ehAssinante={ehAssinante}
            />
          </div>
        </SelecaoMultiplaProvider>
      </NavegacaoProvider>
    );
  }

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
            {/* ViewContent (dataLayer→GTM) — mede o POUSO do anúncio: a pessoa chegou na
                página do carro (destino do criativo/ADS_OPORTUNIDADES). Envia o veículo como
                content_name pra o GTM poder repassar ao Pixel/CAPI. */}
            <RastreioEvento evento="ver_oferta" params={{ pagina: "carro", veiculo: oportunidade.veiculo }} />
            <PaginaOportunidade
              oportunidade={oportunidade}
              bloqueado={bloqueado}
              factSheet={factSheetBia}
              copilotoBloqueado={copilotoBloqueado}
              copilotoResumo={copilotoResumo}
              ehPremium={ehPremiumEfetivo}
              ehAssinante={ehAssinante}
            />
            {!ehAdminPagina && !usuario?.premium && <PonteAssinatura />}
            <OfertasRelacionadas oportunidade={oportunidade} usuario={usuario} />
            {!ehAdminPagina && !usuario?.premium && <BarraPonteScroll />}
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
