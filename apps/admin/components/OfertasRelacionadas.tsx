import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { buscarIdsFavoritados } from "./DiscoveriesBoard";
import { OpportunityCard } from "./OpportunityCard";
import { buscarMargemPremium } from "@/lib/configWorker";
import { semParecer } from "@/lib/copilotoResumo";
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
  const relacionadas = semParecer(await buscarOfertasRelacionadas(oportunidade));
  if (relacionadas.length === 0) return null;

  const idsFavoritados = usuario ? await buscarIdsFavoritados(usuario.id) : new Set<string>();

  // Gate premium — mesmo critério do DiscoveriesBoard: admin e assinante veem
  // tudo; o resto encara o overlay nas ofertas acima do limite (config). Só lê
  // o limite quando o gate pode valer (economiza a query de config).
  const ehAdmin = usuario?.role === "admin";
  const podeBloquear = !ehAdmin && !usuario?.premium;
  const margemPremium = podeBloquear ? await buscarMargemPremium() : Infinity;

  return (
    <section className="ofertas-relacionadas">
      <h2 className="ofertas-relacionadas-titulo">Ofertas relacionadas</h2>
      {podeBloquear && (
        <Link
          href="/planos-slim"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#fff",
            border: "1px solid #E4EAF0",
            borderRadius: 14,
            padding: "13px 16px",
            margin: "-2px 0 16px",
            boxShadow: "0 8px 22px -12px rgba(15,27,45,.28)",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              flex: "none",
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "rgba(22,163,74,.12)",
              color: "#16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={18} strokeWidth={2} />
          </span>
          <span style={{ flex: 1, fontSize: 14, lineHeight: 1.45, color: "#3a4652" }}>
            Mais oportunidades abaixo da FIPE — a maioria some antes de você ver.{" "}
            <b style={{ color: "#16A34A", whiteSpace: "nowrap" }}>
              Desbloqueie todas <ArrowRight size={13} strokeWidth={2.6} style={{ display: "inline", verticalAlign: "-2px" }} />
            </b>
          </span>
        </Link>
      )}
      <div className="board-lista">
        {relacionadas.map((relacionada) => (
          <OpportunityCard
            key={relacionada.id}
            oportunidade={relacionada}
            favoritado={idsFavoritados.has(relacionada.id)}
            isAdmin={ehAdmin}
            usuarioLogado={Boolean(usuario)}
            bloqueado={(relacionada.margem_percentual ?? 0) > margemPremium}
          />
        ))}
      </div>
    </section>
  );
}
