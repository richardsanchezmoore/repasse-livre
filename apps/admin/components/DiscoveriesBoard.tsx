import { supabaseAdmin } from "@/lib/supabase";
import type { Usuario } from "@/lib/supabase-server";
import type { Classificacao } from "@/lib/classificacao";
import { UFS } from "@/lib/mascaras";
import type { Oportunidade, OrigemTipo, StatusOportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { BotaoApagarTudo } from "./BotaoApagarTudo";
import { FiltroClassificacao } from "./FiltroClassificacao";
import { Paginacao } from "./Paginacao";

export type Aba = "descobertas" | "enviadas" | "aprovadas" | "rejeitadas" | "favoritos";
export type Ordem = "recente" | "margem" | "menor_valor" | "maior_valor";

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
  precoMin?: number;
  precoMax?: number;
  ordem?: Ordem;
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
};

function escaparTermoIlike(termo: string): string {
  return termo.replace(/[%_]/g, (caractere) => `\\${caractere}`);
}

async function buscarIdsFavoritados(usuarioId: string): Promise<Set<string>> {
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
  consulta = consulta
    .order(coluna, { ascending: ascendente, nullsFirst: false })
    .order("id", { ascending: true })
    .range(inicio, fim);

  const { data, error, count } = await consulta;

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  return { itens: (data ?? []) as Oportunidade[], total: count ?? 0 };
}

/** UFs com pelo menos uma oportunidade salva (qualquer aba/status) — usado para não listar estados onde o Motor de Descoberta ainda não opera. */
export async function buscarEstadosDisponiveis(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("opportunities").select("estado").not("estado", "is", null);
  if (error) {
    throw new Error(`Falha ao buscar estados disponíveis: ${error.message}`);
  }
  const presentes = new Set((data ?? []).map((linha) => linha.estado as string));
  return UFS.filter((uf) => presentes.has(uf));
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
}: {
  aba: Aba;
  filtros?: FiltrosBoard;
  usuario?: Usuario | null;
  pagina?: number;
}) {
  const { itens: oportunidades, total } = await buscarOportunidades(aba, filtros, usuario, pagina);
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
          <span>
            {TITULO_POR_ABA[aba]} no <strong>{filtros.estado || "Brasil"}</strong>
          </span>
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
      />
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
      <Paginacao aba={aba} filtros={filtros} paginaAtual={pagina} totalPaginas={totalPaginas} />
    </section>
  );
}
