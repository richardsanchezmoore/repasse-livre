import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  buscarEstadosDisponiveis,
  buscarIdsFavoritados,
  buscarModeloPorSlug,
  contarOportunidades,
  ITENS_POR_PAGINA,
} from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { OpportunityCard } from "@/components/OpportunityCard";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { buscarMargemPremium } from "@/lib/configWorker";
import { semParecer } from "@/lib/copilotoResumo";
import { resolverLocalidade } from "@/lib/localidade";
import { buscarConfigSeo, buscarFotoDestaque, substituirVariaveisSeo } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { caminhoModelo, urlModelo } from "@/lib/site";
import { buscarSeoTexto, textoSeoFallback } from "@/lib/seoTexto";
import { TextoSeo } from "@/components/TextoSeo";
import type { Oportunidade } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Terceiro segmento /carros/{cidadeUf}/{marca}/{modelo} = página SEO de MODELO
// (nível abaixo da marca). O modelo NÃO é campo do banco: sai da heurística
// extrairModeloSeo + é resolvido pra grafia canônica em buscarModeloPorSlug, que
// também aplica o GATE de volume (>= MIN_ANUNCIOS_MODELO). Modelo fino/inexistente
// → redirect pra página da marca. Ver project_repasse_livre_seo_pagina_modelo.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidadeUf: string; slug: string; modelo: string }>;
}): Promise<Metadata> {
  const { cidadeUf, slug, modelo } = await params;
  const localidade = await resolverLocalidade(cidadeUf);
  if (!localidade) return {};

  const resolvido = await buscarModeloPorSlug(
    { cidade: localidade.filtroCidade, estado: localidade.filtroEstado },
    slug,
    modelo,
  );
  if (!resolvido) return {};

  const url = urlModelo(
    { cidade: localidade.filtroCidade ?? null, estado: localidade.filtroEstado },
    resolvido.marca,
    resolvido.modelo,
  );
  const variaveis: Record<string, string> = {
    tag: resolvido.marca,
    modelo: resolvido.modelo,
    ...(localidade.chaveSeo === "cidade" ? { cidade: localidade.nome } : { estado: localidade.nome }),
  };

  let titulo = `${resolvido.marca} ${resolvido.modelo} — Carros abaixo da FIPE em ${localidade.nome}`;
  let descricao = `Oportunidades de ${resolvido.marca} ${resolvido.modelo} abaixo da tabela FIPE em ${localidade.nome}.`;

  const [config, foto] = await Promise.all([
    buscarConfigSeo("modelo"),
    buscarFotoDestaque({ cidade: localidade.filtroCidade, estado: localidade.filtroEstado, marca: resolvido.marca }),
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

export default async function PaginaModeloRoute({
  params,
  searchParams,
}: {
  params: Promise<{ cidadeUf: string; slug: string; modelo: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { cidadeUf, slug, modelo } = await params;
  const { pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);

  const localidade = await resolverLocalidade(cidadeUf);
  if (!localidade) {
    redirect(`/carros/${cidadeUf}/${slug}`);
  }

  const resolvido = await buscarModeloPorSlug(
    { cidade: localidade.filtroCidade, estado: localidade.filtroEstado },
    slug,
    modelo,
  );
  if (!resolvido) {
    // Modelo fino (< gate) ou inexistente — cai pra página da marca em vez de 404.
    redirect(`/carros/${cidadeUf}/${slug}`);
  }

  const usuario = await obterUsuarioAtual();
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA - 1;

  let consulta = supabaseAdmin
    .from("opportunities")
    .select("*", { count: "exact" })
    .eq("status", "aprovada")
    .eq("estado", localidade.filtroEstado)
    .ilike("veiculo", `${resolvido.marca} ${resolvido.modelo}%`);
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
    throw new Error(`Falha ao buscar oportunidades do modelo: ${error.message}`);
  }

  const oportunidades = semParecer((data ?? []) as Oportunidade[]);
  const idsFavoritados = usuario ? await buscarIdsFavoritados(usuario.id) : new Set<string>();
  // Gate premium (mesmo critério do board/marca) — trava as ofertas gordas também
  // nesta página SEO pública, senão o funil vaza por aqui.
  const ehAdmin = usuario?.role === "admin";
  const margemPremium = !ehAdmin && !usuario?.premium ? await buscarMargemPremium() : Infinity;
  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const caminhoAtual = caminhoModelo(
    { cidade: localidade.filtroCidade ?? null, estado: localidade.filtroEstado },
    resolvido.marca,
    resolvido.modelo,
  );
  // Parágrafo de SEO (prosa única gerada em batch; template como fallback).
  const ctxSeo = {
    tipo: "modelo" as const,
    localidade: localidade.nome,
    marca: resolvido.marca,
    modelo: resolvido.modelo,
    total,
  };
  const textoSeo =
    (await buscarSeoTexto("modelo", `${cidadeUf}:${slug}:${modelo}`)) ?? textoSeoFallback(ctxSeo);

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
                    {resolvido.marca} {resolvido.modelo} em {localidade.nome}
                  </h1>
                </div>
              </header>
              <TextoSeo texto={textoSeo} />
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
