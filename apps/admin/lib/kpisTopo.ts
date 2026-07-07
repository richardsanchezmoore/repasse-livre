import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * KPIs do topo do board — a "inteligência de mercado" que é o produto (pro
 * comprador/investidor/repassador), não o "anunciar". Vem da RPC `kpis_topo`
 * (agregados no banco, um round-trip; ver migration 0033). Cacheado 15 min —
 * são números de vitrine, não precisam ser tempo-real, e a página carrega leve.
 */
export interface KpisTopo {
  mapeados7d: number;
  abaixoFipe: number;
  novos24h: number;
  economia7d: number;
}

const VAZIO: KpisTopo = { mapeados7d: 0, abaixoFipe: 0, novos24h: 0, economia7d: 0 };

async function computar(): Promise<KpisTopo> {
  const { data, error } = await supabaseAdmin.rpc("kpis_topo");
  const linha = (data as { mapeados_7d: number; abaixo_fipe: number; novos_24h: number; economia_7d: number }[] | null)?.[0];
  if (error || !linha) return VAZIO;
  return {
    mapeados7d: Number(linha.mapeados_7d) || 0,
    abaixoFipe: Number(linha.abaixo_fipe) || 0,
    novos24h: Number(linha.novos_24h) || 0,
    economia7d: Number(linha.economia_7d) || 0,
  };
}

export const buscarKpisTopo = unstable_cache(computar, ["kpis-topo"], { revalidate: 1800 }); // 30 min
