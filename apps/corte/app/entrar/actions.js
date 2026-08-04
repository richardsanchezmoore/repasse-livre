"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enviarEmailReset } from "@/lib/emailAcesso";

function destino(red) {
  return typeof red === "string" && red.startsWith("/") ? red : "/biblioteca";
}

/** Cria conta com senha (SEM confirmação de e-mail) e já loga. */
export async function criarConta({ nome, email, senha, confirma, redirect: red }) {
  nome = String(nome || "").trim();
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!nome) return { erro: "Diga o seu nome." };
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (senha.length < 6) return { erro: "A senha precisa de ao menos 6 caracteres." };
  if (senha !== String(confirma || "")) return { erro: "As senhas não conferem." };

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true, user_metadata: { nome },
  });
  if (error) {
    if (/already|exist|registered|duplicate/i.test(error.message)) {
      return { erro: "Já existe uma conta com esse e-mail. Faça login." };
    }
    return { erro: error.message };
  }
  await admin.from("corte_membros").upsert({ user_id: data.user.id, nome }, { onConflict: "user_id" });

  const sb = await criarSupabaseServer();
  const { error: e2 } = await sb.auth.signInWithPassword({ email, password: senha });
  if (e2) return { erro: "Conta criada, mas o login automático falhou. Tente entrar." };
  redirect(destino(red));
}

/** Recuperação de senha DESACOPLADA do Supabase: gera o token de recuperação
 *  (generateLink, sem disparar e-mail) e manda o link pela NOSSA Resend (branded).
 *  Assim NÃO usamos o template compartilhado do Supabase (que afetaria o Repasse Livre).
 *  Sempre retorna {ok:true} — não vaza se o e-mail existe ou não. */
export async function enviarLinkRecuperacao({ email, origin }) {
  email = String(email || "").trim().toLowerCase();
  const base = String(origin || "").replace(/\/+$/, "");
  const site = base.startsWith("http") ? base : "https://damasvirtuosas.com";
  if (!email.includes("@")) return { ok: true };

  const admin = supabaseAdmin();
  let user = null, pagina = 1;
  while (pagina <= 10 && !user) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    user = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  if (!user) return { ok: true }; // silencioso (não confirma se existe)

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const th = data?.properties?.hashed_token;
  if (error || !th) return { ok: true };
  const link = `${site}/redefinir?th=${encodeURIComponent(th)}`;
  await enviarEmailReset({ email, link });
  return { ok: true };
}

/** Login com e-mail e senha. */
export async function entrarComSenha({ email, senha, redirect: red }) {
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };
  const sb = await criarSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect(destino(red));
}
