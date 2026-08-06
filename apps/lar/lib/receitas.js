import { criarSupabaseServer } from "./supabaseServer";

/** Receitas salvas da mãe (favoritas primeiro). */
export async function minhasReceitas(userId) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_receitas").select("id, nome, categoria, ingredientes, preparo, favorita")
    .eq("user_id", userId).order("favorita", { ascending: false }).order("criado_em", { ascending: false });
  return data || [];
}
