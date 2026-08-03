"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";

export async function entrar({ email, senha }) {
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email.includes("@") || !senha) return { erro: "Enter your email and password." };
  const sb = await criarSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "Email or password doesn't match. Try again." };
  redirect("/");
}
