"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

async function usuaria() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user || null };
}

export async function salvarReceita({ nome, categoria, ingredientes, preparo }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "Entre na sua conta." };
  const n = String(nome || "").trim().slice(0, 100);
  if (!n) return { erro: "Dê um nome à receita. 💛" };
  const ings = String(ingredientes || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 40).map((item) => ({ item }));
  const { data, error } = await sb.from("lar_receitas").insert({
    user_id: user.id, nome: n, categoria: String(categoria || "").slice(0, 30) || null,
    ingredientes: ings, preparo: String(preparo || "").trim().slice(0, 3000) || null, origem: "manual",
  }).select("id").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: data?.id };
}

export async function favoritarReceita({ id, favorita }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_receitas").update({ favorita: !!favorita }).eq("id", id).eq("user_id", user.id);
  return { ok: true };
}

export async function apagarReceita(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_receitas").delete().eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
