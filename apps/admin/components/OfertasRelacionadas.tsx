import { buscarIdsFavoritados } from "./DiscoveriesBoard";
import { OpportunityCard } from "./OpportunityCard";
import { extrairMarcaModelo } from "@/lib/marca";
import { supabaseAdmin } from "@/lib/supabase";
import type { Usuario } from "@/lib/supabase-server";
import type { Oportunidade } from "@/lib/types";

const LIMITE_RELACIONADAS = 6;

type FiltroConsulta = (consulta: ReturnType<typeof construirConsultaBase>) => ReturnType<typeof construirConsultaBase>;

function construirConsultaBase(padraoMarcaModelo: string, idExcluido: string) {
  return supabaseAdmin
    .from("opportunities")
    .select("*")
    .eq("status", "aprovada")
    .ilike("veiculo", padraoMarcaModelo)
    .neq("id", idExcluido);
}

/**
 * Ofertas relacionadas pra mostrar no final da página individual — chave
 * obrigatória é marca+modelo (extrairMarcaModelo), o resto é só relacional
 * (afunilamento de localidade): tenta achar na mesma cidade primeiro, sem
 * exigir — quando não enche o limite, completa com a mesma estado, e por
 * fim com qualquer lugar do Brasil. Nunca relaxa a marca+modelo.
 */
export async function buscarOfertasRelacionadas(oportunidade: Oportunidade): Promise<Oportunidade[]> {
  const marcaModelo = extrairMarcaModelo(oportunidade.veiculo);
  if (!marcaModelo) return [];
  const padrao = `${marcaModelo.marca} ${marcaModelo.modelo}%`;

  const encontradas: Oportunidade[] = [];
  const idsVistos = new Set<string>([oportunidade.id]);

  async function completarCom(filtro: FiltroConsulta) {
    const restante = LIMITE_RELACIONADAS - encontradas.length;
    if (restante <= 0) return;

    let consulta = construirConsultaBase(padrao, oportunidade.id);
    consulta = filtro(consulta);
    consulta = consulta
      .order("data_ordenacao", { ascending: false, nullsFirst: false })
      .limit(restante + idsVistos.size);

    const { data } = await consulta;
    for (const linha of data ?? []) {
      if (idsVistos.has(linha.id as string)) continue;
      idsVistos.add(linha.id as string);
      encontradas.push(linha as Oportunidade);
      if (encontradas.length >= LIMITE_RELACIONADAS) break;
    }
  }

  if (oportunidade.cidade && oportunidade.estado) {
    await completarCom((consulta) => consulta.eq("cidade", oportunidade.cidade!).eq("estado", oportunidade.estado!));
  }
  if (oportunidade.estado) {
    await completarCom((consulta) => consulta.eq("estado", oportunidade.estado!));
  }
  await completarCom((consulta) => consulta);

  return encontradas;
}

export async function OfertasRelacionadas({
  oportunidade,
  usuario,
}: {
  oportunidade: Oportunidade;
  usuario: Usuario | null;
}) {
  const relacionadas = await buscarOfertasRelacionadas(oportunidade);
  if (relacionadas.length === 0) return null;

  const idsFavoritados = usuario ? await buscarIdsFavoritados(usuario.id) : new Set<string>();

  return (
    <section className="ofertas-relacionadas">
      <h2 className="ofertas-relacionadas-titulo">Ofertas relacionadas</h2>
      <div className="board-lista">
        {relacionadas.map((relacionada) => (
          <OpportunityCard
            key={relacionada.id}
            oportunidade={relacionada}
            favoritado={idsFavoritados.has(relacionada.id)}
            isAdmin={usuario?.role === "admin"}
            usuarioLogado={Boolean(usuario)}
          />
        ))}
      </div>
    </section>
  );
}
