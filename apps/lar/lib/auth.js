import { criarSupabaseServer } from "./supabaseServer";

/** Usuária logada (objeto auth.users) ou null. */
export async function usuariaAtual() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
