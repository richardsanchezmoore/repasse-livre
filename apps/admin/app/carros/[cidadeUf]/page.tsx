import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbOportunidade } from "@/components/BreadcrumbOportunidade";
import {
  buscarEstadosDisponiveis,
  buscarIdsFavoritados,
  buscarMarcaPorSlug,
  contarOportunidades,
  ITENS_POR_PAGINA,
} from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { OpportunityCard } from "@/components/OpportunityCard";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { resolverLocalidade } from "@/lib/localidade";
import { buscarConfigSeo, buscarFotoDestaque, substituirVariaveisSeo, type ChaveSeoPagina } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarTagsMarcas } from "@/lib/tags";
import { caminhoMarca, urlMarca } from "@/lib/site";
import type { Oportunidade } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface ContextoPagina {
  titulo: string;
  caminho: string;
  url: string;
  filtroEstado?: string;
  filtroCidade?: string;
  filtroMarca?: string;
  chaveSeo: ChaveSeoPagina;
  variaveis: Record<string, string>;
  precisaTags: boolean;
}

async function resolverContexto(cidadeUf: string): Promise<ContextoPagina | null> {
  const localidade = await resolverLocalidade(cidadeUf);
  if (localidade) {
    return {
      titulo: `Oportunidades em ${localidade.nome}`,
      caminho: localidade.caminho,
      url: localidade.url,
      filtroEstado: localidade.filtroEstado,
      filtroCidade: localidade.filtroCidade,
      chaveSeo: localidade.chaveSeo,
      variaveis: localidade.chaveSeo === "cidade" ? { cidade: localidade.nome } : { estado: localidade.nome },
      precisaTags: true,
    };
  }

  // Sem cidade nem estado: marca de nível Brasil (/carros/{marca}), ex.:
  // /carros/volkswagen — pesquisa nacional, sem filtro geográfico.
  const marcaResolvida = await buscarMarcaPorSlug({}, cidadeUf);
  if (marcaResolvida) {
    return {
      titulo: `${marcaResolvida.marca} no Brasil`,
      caminho: caminhoMarca({}, marcaResolvida.marca),
      url: urlMarca({}, marcaResolvida.marca),
      filtroMarca: marcaResolvida.marca,
      chaveSeo: "marca",
      variaveis: { tag: marcaResolvida.marca },
      precisaTags: false,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidadeUf: string }>;
}): Promise<Metadata> {
  const { cidadeUf } = await params;
  const contexto = await resolverContexto(cidadeUf);
  if (!contexto) return {};

  const nomeLocal = contexto.variaveis.cidade ?? contexto.variaveis.estado ?? contexto.variaveis.tag;
  let titulo = contexto.chaveSeo === "marca"
    ? `${contexto.variaveis.tag} — Carros abaixo da FIPE no Brasil`
    : `Carros abaixo da FIPE em ${nomeLocal}`;
  let descricao = contexto.chaveSeo === "marca"
    ? `Oportunidades de ${contexto.variaveis.tag} abaixo da tabela FIPE em todo o Brasil.`
    : `Oportunidades de carros abaixo da tabela FIPE em ${nomeLocal}.`;

  const [config, tags, foto] = await Promise.all([
    buscarConfigSeo(contexto.chaveSeo),
    contexto.precisaTags
      ? buscarTagsMarcas({ cidade: contexto.filtroCidade, estado: contexto.filtroEstado as string })
      : Promise.resolve(undefined),
    buscarFotoDestaque({ cidade: contexto.filtroCidade, estado: contexto.filtroEstado, marca: contexto.filtroMarca }),
  ]);
  const variaveis = tags !== undefined ? { ...contexto.variaveis, tags } : contexto.variaveis;
  if (config?.titulo) titulo = substituirVariaveisSeo(config.titulo, variaveis);
  if (config?.descricao) descricao = substituirVariaveisSeo(config.descricao, variaveis);

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: contexto.url },
    openGraph: {
      title: titulo,
      description: descricao,
      url: contexto.url,
      images: foto ? [foto] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: foto ? [foto] : undefined,
    },
  };
}

export default async function PaginaLocalidade({
  params,
  searchParams,
}: {
  params: Promise<{ cidadeUf: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { cidadeUf } = await params;
  const { pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);

  const contexto = await resolverContexto(cidadeUf);
  if (!contexto) {
    notFound();
  }

  const usuario = await obterUsuarioAtual();

  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA - 1;

  let consulta = supabaseAdmin.from("opportunities").select("*", { count: "exact" }).eq("status", "aprovada");
  if (contexto.filtroEstado) {
    consulta = consulta.eq("estado", contexto.filtroEstado);
  }
  if (contexto.filtroCidade) {
    consulta = consulta.eq("cidade", contexto.filtroCidade);
  }
  if (contexto.filtroMarca) {
    consulta = consulta.ilike("veiculo", `${contexto.filtroMarca}%`);
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
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  const oportunidades = (data ?? []) as Oportunidade[];
  const idsFavoritados = usuario ? await buscarIdsFavoritados(usuario.id) : new Set<string>();
  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));

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
            <BreadcrumbOportunidade
              oportunidade={{ cidade: contexto.filtroCidade ?? null, estado: contexto.filtroEstado ?? null }}
              marca={contexto.filtroMarca}
              caminhoAtual={contexto.caminho}
            />
            <section className="board">
              <header className="board-header">
                <div className="board-header-titulo">
                  <span className="contador">{total}</span>
                  <h1>{contexto.titulo}</h1>
                </div>
              </header>
              <div className="board-lista">
                {oportunidades.length === 0 && <p className="vazio">Nenhuma oportunidade aqui.</p>}
                {oportunidades.map((oportunidade) => (
                  <OpportunityCard
                    key={oportunidade.id}
                    oportunidade={oportunidade}
                    favoritado={idsFavoritados.has(oportunidade.id)}
                    isAdmin={usuario?.role === "admin"}
                    usuarioLogado={Boolean(usuario)}
                  />
                ))}
              </div>
              {totalPaginas > 1 && (
                <nav className="paginacao" aria-label="Paginação">
                  {pagina > 1 && (
                    <Link href={`${contexto.caminho}?pagina=${pagina - 1}`} className="paginacao-seta">
                      ←
                    </Link>
                  )}
                  <span className="paginacao-item paginacao-item-ativo">
                    {pagina} / {totalPaginas}
                  </span>
                  {pagina < totalPaginas && (
                    <Link href={`${contexto.caminho}?pagina=${pagina + 1}`} className="paginacao-seta">
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
