"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

async function usuaria() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user || null };
}

export async function criarLista({ titulo, tipo }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "Entre na sua conta." };
  const t = String(titulo || "").trim().slice(0, 80) || "Lista de compras";
  const { data, error } = await sb.from("lar_lista").insert({ user_id: user.id, titulo: t, tipo: tipo === "tarefas" ? "tarefas" : "compras" }).select("id, token").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: data?.id, token: data?.token };
}

export async function apagarLista(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_lista").delete().eq("id", id).eq("user_id", user.id);
  return { ok: true };
}

export async function addItem({ listaId, texto }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const t = String(texto || "").trim().slice(0, 120);
  if (!t) return { erro: "Escreva o item." };
  const { data, error } = await sb.from("lar_lista_item").insert({ lista_id: listaId, texto: t }).select("id").maybeSingle();
  if (error) return { erro: error.message };
  await sb.from("lar_lista").update({ atualizado_em: new Date().toISOString() }).eq("id", listaId);
  return { ok: true, id: data?.id };
}

export async function alternarItem({ id, feito }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_lista_item").update({ feito: !!feito, feito_por: feito ? "Você" : null }).eq("id", id);
  return { ok: true };
}

export async function apagarItem(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_lista_item").delete().eq("id", id);
  return { ok: true };
}

// ── Lembretes ──
export async function addLembrete({ texto, data }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const t = String(texto || "").trim().slice(0, 160);
  if (!t) return { erro: "Escreva o lembrete." };
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(data || "")) ? data : null;
  const { data: novo, error } = await sb.from("lar_lembrete").insert({ user_id: user.id, texto: t, data: d }).select("id").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: novo?.id };
}

export async function concluirLembrete(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_lembrete").update({ feito: true }).eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
