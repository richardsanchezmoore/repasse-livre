"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

function segundaISO() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function usuaria() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user || null };
}

/** Marca uma tarefa como feita: reseta o relógio (fica verde) e soma os minutos na semana. */
export async function marcarTarefa(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const { data: t } = await sb.from("lar_casa_tarefa").select("minutos").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!t) return { erro: "não achei" };
  await sb.from("lar_casa_tarefa").update({ ultima_vez: new Date().toISOString() }).eq("id", id);

  const semana = segundaISO();
  const { data: p } = await sb.from("lar_casa_semana").select("*").eq("user_id", user.id).maybeSingle();
  const base = p && p.semana === semana ? p.minutos : 0;
  const minutos = base + (t.minutos || 0);
  await sb.from("lar_casa_semana").upsert({ user_id: user.id, semana, minutos }, { onConflict: "user_id" });
  return { ok: true, minutosSemana: minutos };
}

export async function addTarefa({ comodoId, nome, freq, minutos }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const n = String(nome || "").trim().slice(0, 80);
  if (!n) return { erro: "Dê um nome à tarefa." };
  const { data, error } = await sb.from("lar_casa_tarefa").insert({
    user_id: user.id, comodo_id: comodoId, nome: n,
    freq_dias: Math.min(Math.max(Number(freq) || 3, 1), 60), minutos: Math.min(Math.max(Number(minutos) || 10, 1), 180),
  }).select("id").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: data?.id };
}

export async function apagarTarefa(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_casa_tarefa").delete().eq("id", id).eq("user_id", user.id);
  return { ok: true };
}

export async function alternarComodo(id, ativo) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_casa_comodo").update({ ativo: !!ativo }).eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
