"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";

async function garantirAdmin() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Sem sessão.");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", data.user.id).maybeSingle();
  if (!m?.is_admin) throw new Error("Acesso restrito ao admin.");
}
const refresh = () => revalidatePath("/admin/membros");

export async function alternarAdmin(userId, val) {
  await garantirAdmin();
  await supabaseAdmin().from("corte_membros").upsert({ user_id: userId, is_admin: !!val }, { onConflict: "user_id" });
  refresh();
}

export async function excluirUsuario(userId) {
  await garantirAdmin();
  // Não deixa o admin apagar a própria conta por engano.
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  if (data.user?.id === userId) return { erro: "Você não pode excluir a sua própria conta." };
  const admin = supabaseAdmin();
  // Limpa os vínculos e a conta de auth (uso: excluir contas de teste).
  await admin.from("corte_claims").delete().eq("user_id", userId);
  await admin.from("corte_respostas").delete().eq("user_id", userId);
  await admin.from("corte_dossies").delete().eq("user_id", userId);
  await admin.from("corte_acessos").delete().eq("user_id", userId);
  await admin.from("corte_membros").delete().eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}

export async function definirAcesso(userId, tipo, conceder) {
  await garantirAdmin();
  const admin = supabaseAdmin();
  if (conceder) {
    await admin.from("corte_membros").upsert({ user_id: userId }, { onConflict: "user_id" });
    const expira = tipo === "assinatura" ? new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString() : null;
    await concederAcesso(admin, userId, tipo, { origem: "manual", expira_em: expira });
  } else {
    await revogarAcesso(admin, userId, tipo);
  }
  refresh();
}
