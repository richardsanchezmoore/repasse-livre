import { supabaseAdmin } from "@/lib/supabase";
import type { Oportunidade } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";

async function buscarOportunidades(status: "descoberta" | "aprovada"): Promise<Oportunidade[]> {
  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("*")
    .eq("status", status)
    .order("margem_percentual", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }
  return data as Oportunidade[];
}

async function Board({ titulo, status }: { titulo: string; status: "descoberta" | "aprovada" }) {
  const oportunidades = await buscarOportunidades(status);

  return (
    <section className="board">
      <header className="board-header">
        <span>{titulo}</span>
        <span className="contador">{oportunidades.length}</span>
      </header>
      <div className="board-lista">
        {oportunidades.length === 0 && <p className="vazio">Nenhuma oportunidade aqui.</p>}
        {oportunidades.map((oportunidade) => (
          <OpportunityCard key={oportunidade.id} oportunidade={oportunidade} />
        ))}
      </div>
    </section>
  );
}

export function DiscoveriesBoard() {
  return (
    <div className="boards">
      <Board titulo="Descobertas" status="descoberta" />
      <Board titulo="Enviadas" status="aprovada" />
    </div>
  );
}
