"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Cria conta com senha (sem confirmação de e-mail) e já loga → vai pro onboarding. */
export async function criarConta({ nome, email, senha }) {
  nome = String(nome || "").trim();
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!nome) return { erro: "Diga o seu nome." };
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (senha.length < 6) return { erro: "A senha precisa de ao menos 6 caracteres." };

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true, user_metadata: { nome },
  });
  if (error) {
    if (/already|exist|registered|duplicate/i.test(error.message)) {
      return { erro: "Já existe uma conta com esse e-mail. É só entrar." };
    }
    return { erro: error.message };
  }
  await admin.from("lar_membros").upsert({ user_id: data.user.id, nome }, { onConflict: "user_id" });

  const sb = await criarSupabaseServer();
  const { error: e2 } = await sb.auth.signInWithPassword({ email, password: senha });
  if (e2) return { erro: "Conta criada, mas o login automático falhou. Tente entrar." };
  redirect("/comecar");
}

/** Login com e-mail e senha. */
export async function entrarComSenha({ email, senha }) {
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };
  const sb = await criarSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function sair() {
  const sb = await criarSupabaseServer();
  await sb.auth.signOut();
  redirect("/entrar");
}
