import { supabaseAdmin } from "@/lib/supabase";
import { MARGEM_MINIMA_PADRAO } from "@/lib/margin";

/**
 * Piso de margem de captação — a config `worker_config.MARGEM_MINIMA_PERCENTUAL`
 * que o Motor de Descoberta lê no início de cada varredura. Server-only (usa a
 * service role). Fallback: MARGEM_MINIMA_PADRAO (5) quando a chave não foi
 * configurada. Usado pra deixar o rótulo do filtro ("Bronze X%+") acompanhar o
 * piso automaticamente — ver rotuloClassificacaoFiltro em lib/classificacao.ts.
 */
export async function buscarPisoMargem(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "MARGEM_MINIMA_PERCENTUAL")
    .maybeSingle();
  const n = Number(data?.valor);
  return Number.isFinite(n) && n > 0 ? n : MARGEM_MINIMA_PADRAO;
}
