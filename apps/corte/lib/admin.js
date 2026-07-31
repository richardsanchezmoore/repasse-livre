import { redirect } from "next/navigation";
import { criarSupabaseServer } from "./supabaseServer";

/** Garante que a usuária logada é admin; senão redireciona. Retorna {user, sb}. */
export async function exigirAdmin() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) redirect("/entrar?redirect=/admin");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!m?.is_admin) redirect("/");
  return { user, sb };
}

/** Só checa (sem redirect) — p/ mostrar/esconder o atalho de admin. */
export async function ehAdmin(sb, userId) {
  if (!userId) return false;
  const { data } = await sb.from("corte_membros").select("is_admin").eq("user_id", userId).maybeSingle();
  return !!data?.is_admin;
}
