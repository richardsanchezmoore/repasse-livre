import { criarSupabaseServer } from "./supabaseServer";
import { supabaseAdmin } from "./supabaseAdmin";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ── Listas (dona, via RLS) ──
export async function minhasListas(userId) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_lista").select("id, titulo, tipo, token, atualizado_em").eq("user_id", userId).order("atualizado_em", { ascending: false });
  const listas = data || [];
  // conta itens pendentes por lista
  for (const l of listas) {
    const { count } = await sb.from("lar_lista_item").select("id", { count: "exact", head: true }).eq("lista_id", l.id).eq("feito", false);
    l.pendentes = count || 0;
  }
  return listas;
}

export async function listaComItens(userId, id) {
  const sb = await criarSupabaseServer();
  const { data: lista } = await sb.from("lar_lista").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!lista) return null;
  const { data: itens } = await sb.from("lar_lista_item").select("*").eq("lista_id", id).order("feito").order("criado_em");
  return { ...lista, itens: itens || [] };
}

// ── Lista por TOKEN (público — link do marido; service role) ──
export async function listaPorToken(token) {
  const admin = supabaseAdmin();
  const { data: lista } = await admin.from("lar_lista").select("id, titulo, tipo, token").eq("token", token).maybeSingle();
  if (!lista) return null;
  const { data: itens } = await admin.from("lar_lista_item").select("*").eq("lista_id", lista.id).order("feito").order("criado_em");
  return { ...lista, itens: itens || [] };
}

// ── Lembretes ──
export async function meusLembretes(userId) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_lembrete").select("*").eq("user_id", userId).eq("feito", false).order("data", { nullsFirst: false });
  return data || [];
}

/** Lembretes pra hoje (ou atrasados / sem data) — pro card Hoje. */
export async function lembretesDeHoje(userId) {
  const hoje = iso(new Date());
  return (await meusLembretes(userId)).filter((l) => !l.data || l.data <= hoje);
}
