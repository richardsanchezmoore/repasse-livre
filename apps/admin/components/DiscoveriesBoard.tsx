import { supabaseAdmin } from "@/lib/supabase";
import type { Usuario } from "@/lib/supabase-server";
import type { Classificacao } from "@/lib/classificacao";
import { UFS } from "@/lib/mascaras";
import type { Oportunidade, OrigemTipo, StatusOportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { BotaoApagarTudo } from "./BotaoApagarTudo";
import { FiltroClassificacao } from "./FiltroClassificacao";

export type Aba = "descobertas" | "enviadas" | "aprovadas" | "rejeitadas" | "favoritos";
export type Ordem = "recente" | "margem" | "menor_valor" | "maior_valor";

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

function escaparTermoIlike(termo: string): string {
  return termo.replace(/[%_]/g, (caractere) => `\\${caractere}`);
}

function ordenar(oportunidades: Oportunidade[], ordem: Ordem = "recente"): Oportunidade[] {
  const lista = [...oportunidades];

  switch (ordem) {
    case "margem":
      return lista.sort((a, b) => (b.margem_percentual ?? 0) - (a.margem_percentual ?? 0));
    case "menor_valor":
      return lista.sort((a, b) => a.preco - b.preco);
    case "maior_valor":
      return lista.sort((a, b) => b.preco - a.preco);
    case "recente":
    default:
      // Ordenado pela data/hora mais relevante: a de publicação na fonte
      // original (OLX) quando existir, senão a da nossa captura (Inserção
      // Direta não tem data de publicação original) — a mesma data mostrada
      // no card, para a ordem da lista bater com o que o usuário vê.
      return lista.sort((a, b) => {
        const dataA = new Date(a.data_publicacao_origem ?? a.data_captura).getTime();
        const dataB = new Date(b.data_publicacao_origem ?? b.data_captura).getTime();
        return dataB - dataA;
      });
  }
}

async function buscarIdsFavoritados(usuarioId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from("favoritos").select("opportunity_id").eq("user_id", usuarioId);
  if (error) {
    throw new Error(`Falha ao buscar favoritos: ${error.message}`);
  }
  return new Set((data ?? []).map((linha) => linha.opportunity_id as string));
}

async function buscarOportunidades(
  aba: Aba,
  filtros: FiltrosBoard = {},
  usuario: Usuario | null = null
): Promise<Oportunidade[]> {
  if (!podeAcessarAba(aba, usuario)) return [];

  if (aba === "favoritos") {
    if (!usuario) return [];
    const idsFavoritados = await buscarIdsFavoritados(usuario.id);
    if (idsFavoritados.size === 0) return [];

    let consultaFavoritos = supabaseAdmin.from("opportunities").select("*").in("id", Array.from(idsFavoritados));
    if (filtros.classificacao) consultaFavoritos = consultaFavoritos.eq("classificacao", filtros.classificacao);
    if (filtros.busca) consultaFavoritos = consultaFavoritos.ilike("veiculo", `%${escaparTermoIlike(filtros.busca)}%`);
    if (filtros.estado) consultaFavoritos = consultaFavoritos.eq("estado", filtros.estado);
    if (filtros.precoMin !== undefined) consultaFavoritos = consultaFavoritos.gte("preco", filtros.precoMin);
    if (filtros.precoMax !== undefined) consultaFavoritos = consultaFavoritos.lte("preco", filtros.precoMax);

    const { data, error } = await consultaFavoritos;
    if (error) throw new Error(`Falha ao buscar oportunidades favoritadas: ${error.message}`);
    return ordenar(data as Oportunidade[], filtros.ordem);
  }

  let consulta = supabaseAdmin.from("opportunities").select("*");
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

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  return ordenar(data as Oportunidade[], filtros.ordem);
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

export async function contarOportunidades(usuario: Usuario | null = null): Promise<Record<Aba, number>> {
  const abas: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas", "favoritos"];
  const resultados = await Promise.all(abas.map((aba) => buscarOportunidades(aba, {}, usuario)));
  return Object.fromEntries(abas.map((aba, i) => [aba, resultados[i].length])) as Record<Aba, number>;
}

export async function Board({
  aba,
  filtros = {},
  usuario = null,
}: {
  aba: Aba;
  filtros?: FiltrosBoard;
  usuario?: Usuario | null;
}) {
  const oportunidades = await buscarOportunidades(aba, filtros, usuario);
  const idsFavoritados = aba === "favoritos"
    ? new Set(oportunidades.map((o) => o.id))
    : usuario
      ? await buscarIdsFavoritados(usuario.id)
      : new Set<string>();

  return (
    <section className="board">
      <header className="board-header">
        <span>{TITULO_POR_ABA[aba]}</span>
        <span className="contador">{oportunidades.length}</span>
        {aba === "rejeitadas" && oportunidades.length > 0 && <BotaoApagarTudo />}
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
    </section>
  );
}
