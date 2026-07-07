import { supabaseAdmin } from "@/lib/supabase";
import type { Usuario } from "@/lib/supabase-server";
import type { Classificacao } from "@/lib/classificacao";
import { UFS } from "@/lib/mascaras";
import { MARGEM_MINIMA_PADRAO } from "@/lib/margin";
import { buscarMargemPremium } from "@/lib/configWorker";
import { extrairMarca } from "@/lib/marca";
import type { MarcaContagem } from "@/lib/marcas";
import { dividirSlugCidade, gerarSlugEstado, slugify } from "@/lib/slug";
import type { Oportunidade, OrigemTipo, StatusOportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { BotaoApagarTudo } from "./BotaoApagarTudo";
import { FiltroClassificacao } from "./FiltroClassificacao";
import { Paginacao } from "./Paginacao";
import { RegistradorIdsVisiveis } from "./RegistradorIdsVisiveis";
import { SeletorEstadoBreadcrumb } from "./SeletorEstadoBreadcrumb";

export type Aba = "descobertas" | "enviadas" | "aprovadas" | "rejeitadas" | "favoritos";
export type Ordem = "recente" | "margem" | "menor_valor" | "maior_valor" | "proximidade";

export const ITENS_POR_PAGINA = 40;

// Abas exclusivas de gestão — só visíveis/consultáveis por quem tem
// perfis.role = 'admin'. "aprovadas" (rótulo público "Oportunidades") e
// "favoritos" são acessíveis a qualquer um (favoritos exige login, mas
// não precisa ser admin).
const ABAS_ADMIN: Aba[] = ["descobertas", "enviadas", "rejeitadas"];

export function podeAcessarAba(aba: Aba, usuario: Usuario | null): boolean {
  if (!ABAS_ADMIN.includes(aba)) return true;
  return usuario?.role === "admin";
}

export interface FiltrosBoard {
  classificacao?: Classificacao;
  busca?: string;
  estado?: string;
  /** Verdadeiro quando o usuário escolheu "Brasil" de forma explícita (sentinela estado=BR na URL).
   * Sem isso, a paginação perde o parâmetro e o geo-detect da Vercel ativa outro estado no carregamento
   * seguinte — Supabase retorna 416 "Requested range not satisfiable" se a página pedida não existir
   * no novo recorte menor. */
  estadoBR?: boolean;
  precoMin?: number;
  precoMax?: number;
  /** Faixa de ano do modelo (texto de 4 dígitos — comparação lexicográfica = numérica). */
  anoMin?: string;
  anoMax?: string;
  ordem?: Ordem;
  /** Coordenadas do usuário — só usadas quando ordem === "proximidade" (ver lib/geolocalizacao.ts). */
  lat?: number;
  lng?: number;
  /** Tipo de anunciante (campo `professionalAd` da OLX) — undefined = todos. */
  anunciante?: "profissional" | "particular";
  /** Fonte única selecionada (OLX/WEBMOTORS/MERCADO_LIVRE) — undefined = todas. */
  fonte?: string;
  /** Marca (1ª palavra do veiculo) — filtra por prefixo. undefined = todas. */
  marca?: string;
}

const TITULO_POR_ABA: Record<Aba, string> = {
  descobertas: "Descobertas",
  enviadas: "Enviadas",
  aprovadas: "Oportunidades",
  rejeitadas: "Rejeitadas",
  favoritos: "Favoritos",
};

const FILTRO_POR_ABA: Record<
  Exclude<Aba, "favoritos">,
  { origem_tipo?: OrigemTipo; status: StatusOportunidade }
> = {
  descobertas: { origem_tipo: "descoberta", status: "descoberta" },
  enviadas: { origem_tipo: "insercao_direta", status: "descoberta" },
  aprovadas: { status: "aprovada" },
  rejeitadas: { status: "rejeitada" },
};

// Ordenação resolvida no SQL (não mais em JS) para permitir paginação real
// via LIMIT/OFFSET. "recente" usa a coluna gerada data_ordenacao — ver
// migration 0011 (coalesce de data_publicacao_origem e data_captura). O
// segundo critério (id) é só pra manter a ordem estável entre páginas.
const ORDEM_SQL: Record<Ordem, { coluna: string; ascendente: boolean }> = {
  recente: { coluna: "data_ordenacao", ascendente: false },
  margem: { coluna: "margem_percentual", ascendente: false },
  menor_valor: { coluna: "preco", ascendente: true },
  maior_valor: { coluna: "preco", ascendente: false },
  // "proximidade" não passa por aqui — buscarOportunidades trata via RPC
  // (oportunidades_por_proximidade) antes de chegar nesse ORDER BY genérico.
  proximidade: { coluna: "data_ordenacao", ascendente: false },
};

function escaparTermoIlike(termo: string): string {
  return termo.replace(/[%_]/g, (caractere) => `\\${caractere}`);
}

export async function buscarIdsFavoritados(usuarioId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from("favoritos").select("opportunity_id").eq("user_id", usuarioId);
  if (error) {
    throw new Error(`Falha ao buscar favoritos: ${error.message}`);
  }
  return new Set((data ?? []).map((linha) => linha.opportunity_id as string));
}

interface ResultadoBusca {
  itens: Oportunidade[];
  total: number;
}

async function buscarOportunidades(
  aba: Aba,
  filtros: FiltrosBoard = {},
  usuario: Usuario | null = null,
  pagina: number = 1
): Promise<ResultadoBusca> {
  if (!podeAcessarAba(aba, usuario)) return { itens: [], total: 0 };

  const { coluna, ascendente } = ORDEM_SQL[filtros.ordem ?? "recente"];
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA - 1;

  // "Perto de mim" só existe na vitrine pública (aprovadas) e só com
  // coordenadas resolvidas (ver lib/geolocalizacao.ts) — combinação
  // diferente disso (ex.: URL manipulada) cai pro ORDER BY padrão abaixo.
  if (aba === "aprovadas" && filtros.ordem === "proximidade" && filtros.lat !== undefined && filtros.lng !== undefined) {
    const { data, error } = await supabaseAdmin.rpc("oportunidades_por_proximidade", {
      p_lat: filtros.lat,
      p_lng: filtros.lng,
      p_classificacao: filtros.classificacao ?? null,
      p_busca: filtros.busca ?? null,
      p_estado: filtros.estado ?? null,
      p_preco_min: filtros.precoMin ?? null,
      p_preco_max: filtros.precoMax ?? null,
      p_anunciante: filtros.anunciante === "profissional" ? true : filtros.anunciante === "particular" ? false : null,
      p_ano_min: filtros.anoMin ?? null,
      p_ano_max: filtros.anoMax ?? null,
      p_fonte: filtros.fonte ?? null,
      p_marca: filtros.marca ?? null,
      p_limite: ITENS_POR_PAGINA,
      p_deslocamento: inicio,
    });
    if (error) {
      throw new Error(`Falha ao buscar oportunidades por proximidade: ${error.message}`);
    }
    const linhas = (data ?? []) as Array<Oportunidade & { total: string | number }>;
    return { itens: linhas, total: linhas.length > 0 ? Number(linhas[0].total) : 0 };
  }

  if (aba === "favoritos") {
    if (!usuario) return { itens: [], total: 0 };
    const idsFavoritados = await buscarIdsFavoritados(usuario.id);
    if (idsFavoritados.size === 0) return { itens: [], total: 0 };

    let consultaFavoritos = supabaseAdmin
      .from("opportunities")
      .select("*", { count: "exact" })
      .in("id", Array.from(idsFavoritados));
    if (filtros.classificacao) consultaFavoritos = consultaFavoritos.eq("classificacao", filtros.classificacao);
    if (filtros.busca) consultaFavoritos = consultaFavoritos.ilike("veiculo", `%${escaparTermoIlike(filtros.busca)}%`);
    if (filtros.estado) consultaFavoritos = consultaFavoritos.eq("estado", filtros.estado);
    if (filtros.precoMin !== undefined) consultaFavoritos = consultaFavoritos.gte("preco", filtros.precoMin);
    if (filtros.precoMax !== undefined) consultaFavoritos = consultaFavoritos.lte("preco", filtros.precoMax);
    if (filtros.anoMin) consultaFavoritos = consultaFavoritos.gte("ano", filtros.anoMin);
    if (filtros.anoMax) consultaFavoritos = consultaFavoritos.lte("ano", filtros.anoMax);
    if (filtros.fonte) consultaFavoritos = consultaFavoritos.eq("fonte", filtros.fonte);
    if (filtros.anunciante) {
      consultaFavoritos = consultaFavoritos.eq("anunciante_profissional", filtros.anunciante === "profissional");
    }
    consultaFavoritos = consultaFavoritos
      .order(coluna, { ascending: ascendente, nullsFirst: false })
      .order("id", { ascending: true })
      .range(inicio, fim);

    const { data, error, count } = await consultaFavoritos;
    if (error) throw new Error(`Falha ao buscar oportunidades favoritadas: ${error.message}`);
    return { itens: (data ?? []) as Oportunidade[], total: count ?? 0 };
  }

  let consulta = supabaseAdmin.from("opportunities").select("*", { count: "exact" });
  const filtro = FILTRO_POR_ABA[aba];
  consulta = consulta.eq("status", filtro.status);
  if (filtro.origem_tipo) {
    consulta = consulta.eq("origem_tipo", filtro.origem_tipo);
  }

  if (filtros.classificacao) {
    consulta = consulta.eq("classificacao", filtros.classificacao);
  }
  if (filtros.busca) {
    consulta = consulta.ilike("veiculo", `%${escaparTermoIlike(filtros.busca)}%`);
  }
  if (filtros.estado) {
    consulta = consulta.eq("estado", filtros.estado);
  }
  if (filtros.precoMin !== undefined) {
    consulta = consulta.gte("preco", filtros.precoMin);
  }
  if (filtros.precoMax !== undefined) {
    consulta = consulta.lte("preco", filtros.precoMax);
  }
  if (filtros.anoMin) {
    consulta = consulta.gte("ano", filtros.anoMin);
  }
  if (filtros.anoMax) {
    consulta = consulta.lte("ano", filtros.anoMax);
  }
  if (filtros.fonte) {
    consulta = consulta.eq("fonte", filtros.fonte);
  }
  if (filtros.marca) {
    // Marca = 1ª palavra do veiculo → filtra por prefixo (mesmo critério das
    // páginas SEO de marca, buscarMarcaPorSlug).
    consulta = consulta.ilike("veiculo", `${filtros.marca}%`);
  }
  if (filtros.anunciante) {
    consulta = consulta.eq("anunciante_profissional", filtros.anunciante === "profissional");
  }
  consulta = consulta
    .order(coluna, { ascending: ascendente, nullsFirst: false })
    .order("id", { ascending: true })
    .range(inicio, fim);

  const { data, error, count } = await consulta;

  if (error) {
    // Supabase 416: offset pedido além do total real — acontece quando o filtro
    // muda entre a listagem e a navegação de página (ex.: geo-detect ativa outro
    // estado depois que o usuário escolheu "Brasil"). Degrada em lista vazia.
    if (error.message?.includes("Requested range not satisfiable")) {
      return { itens: [], total: 0 };
    }
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  return { itens: (data ?? []) as Oportunidade[], total: count ?? 0 };
}

/** Busca uma oportunidade pública (aprovada) pra página individual — null se não existir, não estiver aprovada ou tiver sido apagada. */
export async function buscarOportunidadePorId(
  id: string,
  incluirNaoAprovadas = false
): Promise<Oportunidade | null> {
  // Público só enxerga aprovadas. Admin (incluirNaoAprovadas=true) enxerga
  // também Descobertas/etc., pra revisar a página individual antes de aprovar.
  let consulta = supabaseAdmin.from("opportunities").select("*").eq("id", id);
  if (!incluirNaoAprovadas) consulta = consulta.eq("status", "aprovada");
  const { data, error } = await consulta.maybeSingle();
  if (error) {
    throw new Error(`Falha ao buscar oportunidade: ${error.message}`);
  }
  return (data as Oportunidade | null) ?? null;
}

/**
 * UFs com pelo menos uma oportunidade na aba/status pedido — escopado pra
 * não listar, por exemplo, um estado na vitrine pública (aba "aprovadas")
 * onde só existem anúncios ainda em "descobertas": o usuário escolhia o
 * estado e a lista vinha vazia, mesmo a UF aparecendo como opção.
 */
export async function buscarEstadosDisponiveis(
  aba: Aba = "aprovadas",
  usuario: Usuario | null = null
): Promise<string[]> {
  if (aba === "favoritos") {
    if (!usuario) return [];
    const idsFavoritados = await buscarIdsFavoritados(usuario.id);
    if (idsFavoritados.size === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select("estado")
      .in("id", Array.from(idsFavoritados))
      .not("estado", "is", null);
    if (error) {
      throw new Error(`Falha ao buscar estados disponíveis: ${error.message}`);
    }
    const presentes = new Set((data ?? []).map((linha) => linha.estado as string));
    return UFS.filter((uf) => presentes.has(uf));
  }

  const filtro = FILTRO_POR_ABA[aba];
  let consulta = supabaseAdmin.from("opportunities").select("estado").eq("status", filtro.status).not("estado", "is", null);
  if (filtro.origem_tipo) {
    consulta = consulta.eq("origem_tipo", filtro.origem_tipo);
  }

  const { data, error } = await consulta;
  if (error) {
    throw new Error(`Falha ao buscar estados disponíveis: ${error.message}`);
  }
  const presentes = new Set((data ?? []).map((linha) => linha.estado as string));
  return UFS.filter((uf) => presentes.has(uf));
}

export interface CidadeResolvida {
  cidade: string;
  estado: string;
  total: number;
}

/**
 * Resolve o segmento de path /carros/{cidadeUf}/ pro par
 * (cidade, estado) reais — a UF (2 letras) já vem certa no slug, mas o
 * nome da cidade precisa casar contra a grafia exata salva no banco
 * (acentos, maiúsculas). Escopado por estado pra não varrer a tabela toda.
 */
export async function buscarCidadePorSlug(cidadeUf: string): Promise<CidadeResolvida | null> {
  const dividido = dividirSlugCidade(cidadeUf);
  if (!dividido) return null;

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("cidade")
    .eq("status", "aprovada")
    .eq("estado", dividido.estado)
    .not("cidade", "is", null);
  if (error) {
    throw new Error(`Falha ao buscar cidade: ${error.message}`);
  }

  const contagemPorCidade = new Map<string, number>();
  for (const linha of data ?? []) {
    const cidade = linha.cidade as string;
    if (slugify(cidade) === dividido.cidadeSlug) {
      contagemPorCidade.set(cidade, (contagemPorCidade.get(cidade) ?? 0) + 1);
    }
  }

  if (contagemPorCidade.size === 0) return null;

  // Mesma cidade pode estar salva com grafias levemente diferentes
  // (maiúscula/minúscula) — usa a mais frequente como canônica.
  const [cidadeCanonica, total] = [...contagemPorCidade.entries()].sort((a, b) => b[1] - a[1])[0];
  return { cidade: cidadeCanonica, estado: dividido.estado, total };
}

export interface EstadoResolvido {
  estado: string;
  total: number;
}

/**
 * Resolve o segmento de path /carros/{estadoSlug}/ (ex.: "pernambuco") pra
 * UF real — só tentada quando o slug não casa o padrão de cidade (que
 * sempre termina em "-xx"), ver app/carros/[cidadeUf]/page.tsx.
 */
export async function buscarEstadoPorSlug(estadoSlug: string): Promise<EstadoResolvido | null> {
  const estadosDisponiveis = await buscarEstadosDisponiveis();
  const uf = estadosDisponiveis.find((candidata) => gerarSlugEstado(candidata) === estadoSlug);
  if (!uf) return null;

  const { count, error } = await supabaseAdmin
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("status", "aprovada")
    .eq("estado", uf);
  if (error) {
    throw new Error(`Falha ao contar oportunidades do estado: ${error.message}`);
  }

  return { estado: uf, total: count ?? 0 };
}

export interface MarcaResolvida {
  marca: string;
  total: number;
}

const LIMITE_AMOSTRA_MARCA = 1000;
const LIMITE_AMOSTRA_MARCA_NACIONAL = 5000;

/**
 * Resolve o segmento {marcaSlug} (ex.: "volkswagen") pra a grafia real da
 * marca — escopado por cidade+estado, só estado, ou nacional (nenhum dos
 * dois, ver /carros/{marcaSlug} de nível Brasil). Mesmo princípio de
 * buscarCidadePorSlug: casa por slug numa amostra, escolhe a grafia mais
 * frequente, conta o total exato depois com ilike.
 */
export async function buscarMarcaPorSlug(
  filtro: { cidade?: string; estado?: string },
  marcaSlug: string
): Promise<MarcaResolvida | null> {
  let consultaAmostra = supabaseAdmin
    .from("opportunities")
    .select("veiculo")
    .eq("status", "aprovada")
    .limit(filtro.estado ? LIMITE_AMOSTRA_MARCA : LIMITE_AMOSTRA_MARCA_NACIONAL);
  if (filtro.estado) {
    consultaAmostra = consultaAmostra.eq("estado", filtro.estado);
  }
  if (filtro.cidade) {
    consultaAmostra = consultaAmostra.eq("cidade", filtro.cidade);
  }

  const { data, error } = await consultaAmostra;
  if (error) {
    throw new Error(`Falha ao buscar marca: ${error.message}`);
  }

  const contagemPorMarca = new Map<string, number>();
  for (const linha of data ?? []) {
    const marca = extrairMarca(linha.veiculo as string);
    if (marca && slugify(marca) === marcaSlug) {
      contagemPorMarca.set(marca, (contagemPorMarca.get(marca) ?? 0) + 1);
    }
  }

  if (contagemPorMarca.size === 0) return null;

  const [marcaCanonica] = [...contagemPorMarca.entries()].sort((a, b) => b[1] - a[1])[0];

  let consultaTotal = supabaseAdmin
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("status", "aprovada")
    .ilike("veiculo", `${marcaCanonica}%`);
  if (filtro.estado) {
    consultaTotal = consultaTotal.eq("estado", filtro.estado);
  }
  if (filtro.cidade) {
    consultaTotal = consultaTotal.eq("cidade", filtro.cidade);
  }
  const { count, error: erroTotal } = await consultaTotal;
  if (erroTotal) {
    throw new Error(`Falha ao contar oportunidades da marca: ${erroTotal.message}`);
  }

  return { marca: marcaCanonica, total: count ?? 0 };
}

/** Contagem por aba pros badges da Sidebar — só conta, não carrega as linhas. */
export async function contarOportunidades(usuario: Usuario | null = null): Promise<Record<Aba, number>> {
  const abas: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas", "favoritos"];
  const resultados = await Promise.all(
    abas.map(async (aba) => {
      if (!podeAcessarAba(aba, usuario)) return 0;

      if (aba === "favoritos") {
        if (!usuario) return 0;
        const idsFavoritados = await buscarIdsFavoritados(usuario.id);
        return idsFavoritados.size;
      }

      const filtro = FILTRO_POR_ABA[aba];
      let consulta = supabaseAdmin
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", filtro.status);
      if (filtro.origem_tipo) {
        consulta = consulta.eq("origem_tipo", filtro.origem_tipo);
      }
      const { count, error } = await consulta;
      if (error) throw new Error(`Falha ao contar oportunidades (${aba}): ${error.message}`);
      return count ?? 0;
    })
  );
  return Object.fromEntries(abas.map((aba, i) => [aba, resultados[i]])) as Record<Aba, number>;
}

export async function Board({
  aba,
  filtros = {},
  usuario = null,
  pagina = 1,
  estadosDisponiveis = [],
  marcasDisponiveis = [],
  pisoMargem = MARGEM_MINIMA_PADRAO,
  proximidadeDisponivel = false,
}: {
  aba: Aba;
  filtros?: FiltrosBoard;
  usuario?: Usuario | null;
  pagina?: number;
  estadosDisponiveis?: string[];
  marcasDisponiveis?: MarcaContagem[];
  pisoMargem?: number;
  proximidadeDisponivel?: boolean;
}) {
  const { itens: oportunidades, total } = await buscarOportunidades(aba, filtros, usuario, pagina);
  // Gate premium: admin e assinante veem tudo; o resto encara o overlay nas ofertas
  // acima do limite (config). Só lê o limite quando o gate pode valer (economiza query).
  const ehAdmin = usuario?.role === "admin";
  const podeBloquear = !ehAdmin && !usuario?.premium;
  const margemPremium = podeBloquear ? await buscarMargemPremium() : Infinity;
  const idsFavoritados = aba === "favoritos"
    ? new Set(oportunidades.map((o) => o.id))
    : usuario
      ? await buscarIdsFavoritados(usuario.id)
      : new Set<string>();
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const inicioIntervalo = total === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1;
  const fimIntervalo = Math.min(pagina * ITENS_POR_PAGINA, total);

  return (
    <section className="board">
      <header className="board-header">
        <div className="board-header-titulo">
          <span className="contador">{total}</span>
          <SeletorEstadoBreadcrumb
            aba={aba}
            titulo={TITULO_POR_ABA[aba]}
            estadoAtivo={filtros.estado}
            estadosDisponiveis={estadosDisponiveis}
          />
          {aba === "rejeitadas" && total > 0 && <BotaoApagarTudo />}
        </div>
        {total > 0 && (
          <span className="board-header-resultados">
            {inicioIntervalo} - {fimIntervalo} de {total} resultados
          </span>
        )}
      </header>
      <FiltroClassificacao
        aba={aba}
        ativa={filtros.classificacao}
        ordem={filtros.ordem}
        precoMin={filtros.precoMin}
        precoMax={filtros.precoMax}
        anoMin={filtros.anoMin}
        anoMax={filtros.anoMax}
        anunciante={filtros.anunciante}
        fonte={filtros.fonte}
        marca={filtros.marca}
        marcas={marcasDisponiveis}
        piso={pisoMargem}
        proximidadeDisponivel={proximidadeDisponivel}
      />
      <RegistradorIdsVisiveis ids={oportunidades.map((o) => o.id)} />
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
      <Paginacao aba={aba} filtros={filtros} paginaAtual={pagina} totalPaginas={totalPaginas} />
    </section>
  );
}
