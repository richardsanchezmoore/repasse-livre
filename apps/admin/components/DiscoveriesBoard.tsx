import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { CLASSIFICACOES, ROTULO_CLASSIFICACAO_FILTRO, type Classificacao } from "@/lib/classificacao";
import type { Oportunidade, OrigemTipo, StatusOportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { BotaoApagarTudo } from "./BotaoApagarTudo";

export type Aba = "descobertas" | "enviadas" | "aprovadas" | "rejeitadas";

const TITULO_POR_ABA: Record<Aba, string> = {
  descobertas: "Descobertas",
  enviadas: "Enviadas",
  aprovadas: "Aprovadas",
  rejeitadas: "Rejeitadas",
};

const FILTRO_POR_ABA: Record<Aba, { origem_tipo?: OrigemTipo; status: StatusOportunidade }> = {
  descobertas: { origem_tipo: "descoberta", status: "descoberta" },
  enviadas: { origem_tipo: "insercao_direta", status: "descoberta" },
  aprovadas: { status: "aprovada" },
  rejeitadas: { status: "rejeitada" },
};

async function buscarOportunidades(aba: Aba, classificacao?: Classificacao): Promise<Oportunidade[]> {
  const filtro = FILTRO_POR_ABA[aba];
  let consulta = supabaseAdmin.from("opportunities").select("*").eq("status", filtro.status);

  if (filtro.origem_tipo) {
    consulta = consulta.eq("origem_tipo", filtro.origem_tipo);
  }
  if (classificacao) {
    consulta = consulta.eq("classificacao", classificacao);
  }

  const { data, error } = await consulta.order("margem_percentual", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }
  return data as Oportunidade[];
}

export async function contarOportunidades(): Promise<Record<Aba, number>> {
  const abas: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas"];
  const resultados = await Promise.all(abas.map((aba) => buscarOportunidades(aba)));
  return Object.fromEntries(abas.map((aba, i) => [aba, resultados[i].length])) as Record<Aba, number>;
}

function FiltroClassificacao({ aba, ativa }: { aba: Aba; ativa?: Classificacao }) {
  return (
    <div className="filtro-classificacao">
      <Link href={`/?aba=${aba}`} className={`filtro-chip ${!ativa ? "filtro-chip-ativo" : ""}`}>
        Todas
      </Link>
      {CLASSIFICACOES.map((classificacao) => (
        <Link
          key={classificacao}
          href={`/?aba=${aba}&classificacao=${classificacao}`}
          className={`filtro-chip ${ativa === classificacao ? "filtro-chip-ativo" : ""}`}
        >
          {ROTULO_CLASSIFICACAO_FILTRO[classificacao]}
        </Link>
      ))}
    </div>
  );
}

export async function Board({ aba, classificacao }: { aba: Aba; classificacao?: Classificacao }) {
  const oportunidades = await buscarOportunidades(aba, classificacao);

  return (
    <section className="board">
      <header className="board-header">
        <span>{TITULO_POR_ABA[aba]}</span>
        <span className="contador">{oportunidades.length}</span>
        {aba === "rejeitadas" && oportunidades.length > 0 && <BotaoApagarTudo />}
      </header>
      <FiltroClassificacao aba={aba} ativa={classificacao} />
      <div className="board-lista">
        {oportunidades.length === 0 && <p className="vazio">Nenhuma oportunidade aqui.</p>}
        {oportunidades.map((oportunidade) => (
          <OpportunityCard key={oportunidade.id} oportunidade={oportunidade} />
        ))}
      </div>
    </section>
  );
}
