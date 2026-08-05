import { criarSupabaseServer } from "./supabaseServer";

/** Usuária logada (auth.users) + a família dela (lar_familia), ou nulos.
 *  Usa o client de sessão → RLS deixa ler só a própria linha. */
export async function contexto() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user || null;
  if (!user) return { user: null, familia: null };
  const { data: familia } = await sb.from("lar_familia").select("*").eq("user_id", user.id).maybeSingle();
  return { user, familia: familia || null };
}
