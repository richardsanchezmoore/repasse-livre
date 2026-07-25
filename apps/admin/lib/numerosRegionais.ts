import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { NOME_POR_UF, PREPOSICAO_POR_UF } from "@/lib/estados";

/**
 * "Prova regional" pra landing de anúncio: contagem de oportunidades por estado.
 * A campanha de tráfego pago mira POA (RS) + CWB (PR), então mostrar os números do
 * PR e RS localiza a prova pra 100% do tráfego — mesmo que o card-demo seja de
 * outro estado, o visitante vê que TEM oferta na região dele. Ver
 * project_repasse_livre_card_travado_foto_sanitize / landing de dor.
 */
export interface NumeroEstado {
  uf: string;
  nome: string; // "Paraná"
  preposicao: string; // "no" | "na" | "em" — pra "abaixo da FIPE {prep} {nome}"
  abaixoFipe: number; // total aprovado abaixo da FIPE
  novas24h: number; // descobertas nas últimas 24h
}

async function contar(uf: string): Promise<NumeroEstado> {
  const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const base = () =>
    supabaseAdmin
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "aprovada")
      .eq("estado", uf);

  const [abaixo, novas] = await Promise.all([
    base().gt("margem_percentual", 0), // margem_percentual > 0 = abaixo da FIPE
    base().gte("data_captura", desde24h),
  ]);

  return {
    uf,
    nome: NOME_POR_UF[uf] ?? uf,
    preposicao: PREPOSICAO_POR_UF[uf] ?? "em",
    abaixoFipe: abaixo.count ?? 0,
    novas24h: novas.count ?? 0,
  };
}

// unstable_cache inclui o argumento na chave → cacheia por UF (igual kpisTopo).
const contarCache = unstable_cache(contar, ["numeros-regionais"], { revalidate: 1800 });

export async function buscarNumerosRegionais(ufs: string[]): Promise<NumeroEstado[]> {
  return Promise.all(ufs.map((uf) => contarCache(uf)));
}
