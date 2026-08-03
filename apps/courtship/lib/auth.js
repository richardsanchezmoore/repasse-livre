import { criarSupabaseServer } from "./supabaseServer";

/** The logged-in user (auth.users row) or null. */
export async function usuariaAtual() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
