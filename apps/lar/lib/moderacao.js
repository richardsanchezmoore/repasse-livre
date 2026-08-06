import { criarSupabaseServer } from "./supabaseServer";
import { supabaseAdmin } from "./supabaseAdmin";

/** { user, moderadora } — moderadora = is_admin da conta OU papel moderadora/admin na Sala. */
export async function checarModerador() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { user: null, moderadora: false };
  const admin = supabaseAdmin();
  const [{ data: membro }, { data: perfil }] = await Promise.all([
    admin.from("lar_membros").select("is_admin").eq("user_id", user.id).maybeSingle(),
    admin.from("lar_sala_perfil").select("papel").eq("user_id", user.id).maybeSingle(),
  ]);
  const moderadora = !!membro?.is_admin || ["moderadora", "admin"].includes(perfil?.papel);
  return { user, moderadora };
}
