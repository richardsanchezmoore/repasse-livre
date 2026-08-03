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

/** Admin define/redefine a senha de um membro já existente (pra repassar ao cliente). */
export async function definirSenhaMembro(userId, senha) {
  await garantirAdmin();
  senha = String(senha || "");
  if (senha.length < 6) return { erro: "A senha precisa de ao menos 6 caracteres." };
  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
  if (error) return { erro: error.message };
  // conta agora tem senha definida → encerra o onboarding pendente (se houver)
  await admin.from("corte_membros").update({ setup_pendente: false, setup_expira_em: null }).eq("user_id", userId);
  refresh();
  return { ok: true };
}

/** Libera um cliente do ZERO: acha ou cria a conta, define a senha e concede o acesso.
 *  Uso: dar acesso manual (cortesia/venda externa) sem depender do webhook. */
export async function criarAcessoCliente({ email, senha, tipo = "kit" }) {
  await garantirAdmin();
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (senha.length < 6) return { erro: "A senha precisa de ao menos 6 caracteres." };
  const admin = supabaseAdmin();

  let user = null, pagina = 1;
  while (pagina <= 10 && !user) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    user = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  let criado = false;
  if (!user) {
    const { data: novo, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: senha });
    if (error) return { erro: error.message };
    user = novo.user;
    criado = true;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: senha });
    if (error) return { erro: error.message };
  }
  await admin.from("corte_membros").upsert({ user_id: user.id, setup_pendente: false, setup_expira_em: null }, { onConflict: "user_id" });
  const expira = tipo === "assinatura" ? new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString() : null;
  await concederAcesso(admin, user.id, tipo, { origem: "manual", expira_em: expira });
  refresh();
  return { ok: true, criado };
}
