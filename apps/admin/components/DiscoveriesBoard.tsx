import { supabaseAdmin } from "@/lib/supabase";
import type { Classificacao } from "@/lib/classificacao";
import type { Oportunidade, OrigemTipo, StatusOportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { BotaoApagarTudo } from "./BotaoApagarTudo";
import { FiltroClassificacao } from "./FiltroClassificacao";

export type Aba = "descobertas" | "enviadas" | "aprovadas" | "rejeitadas" | "favoritos";
export type Ordem = "recente" | "margem" | "menor_valor" | "maior_valor";

export interface FiltrosBoard {
  classificacao?: Classificacao;
  busca?: string;
  precoMin?: number;
  precoMax?: number;
  ordem?: Ordem;
}

const TITULO_POR_ABA: Record<Aba, string> = {
  descobertas: "Descobertas",
  enviadas: "Enviadas",
  aprovadas: "Aprovadas",
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

async function buscarOportunidades(aba: Aba, filtros: FiltrosBoard = {}): Promise<Oportunidade[]> {
  let consulta = supabaseAdmin.from("opportunities").select("*");

  if (aba === "favoritos") {
    consulta = consulta.eq("favorito", true);
  } else {
    const filtro = FILTRO_POR_ABA[aba];
    consulta = consulta.eq("status", filtro.status);
    if (filtro.origem_tipo) {
      consulta = consulta.eq("origem_tipo", filtro.origem_tipo);
    }
  }

  if (filtros.classificacao) {
    consulta = consulta.eq("classificacao", filtros.classificacao);
  }
  if (filtros.busca) {
    consulta = consulta.ilike("veiculo", `%${escaparTermoIlike(filtros.busca)}%`);
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

export async function contarOportunidades(): Promise<Record<Aba, number>> {
  const abas: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas", "favoritos"];
  const resultados = await Promise.all(abas.map((aba) => buscarOportunidades(aba)));
  return Object.fromEntries(abas.map((aba, i) => [aba, resultados[i].length])) as Record<Aba, number>;
}

export async function Board({ aba, filtros = {} }: { aba: Aba; filtros?: FiltrosBoard }) {
  const oportunidades = await buscarOportunidades(aba, filtros);

  return (
    <section className="board">
      <header className="board-header">
        <span>{TITULO_POR_ABA[aba]}</span>
        <span className="contador">{oportunidades.length}</span>
        {aba === "rejeitadas" && oportunidades.length > 0 && <BotaoApagarTudo />}
      </header>
      <FiltroClassificacao aba={aba} ativa={filtros.classificacao} />
      <div className="board-lista">
        {oportunidades.length === 0 && <p className="vazio">Nenhuma oportunidade aqui.</p>}
        {oportunidades.map((oportunidade) => (
          <OpportunityCard key={oportunidade.id} oportunidade={oportunidade} />
        ))}
      </div>
    </section>
  );
}
