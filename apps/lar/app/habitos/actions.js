"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

const isoHoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function usuaria() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user || null };
}

/** Marca/desmarca o hábito no dia de hoje. */
export async function alternarHoje(habitoId) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const dia = isoHoje();
  const { data: existe } = await sb.from("lar_habito_log").select("id").eq("habito_id", habitoId).eq("dia", dia).maybeSingle();
  if (existe) { await sb.from("lar_habito_log").delete().eq("id", existe.id); return { ok: true, feito: false }; }
  await sb.from("lar_habito_log").insert({ user_id: user.id, habito_id: habitoId, dia });
  return { ok: true, feito: true };
}

export async function addHabito({ nome, icone }) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  const n = String(nome || "").trim().slice(0, 40);
  if (!n) return { erro: "Dê um nome ao hábito." };
  const { data, error } = await sb.from("lar_habito").insert({ user_id: user.id, nome: n, icone: String(icone || "💛").slice(0, 8), ordem: 99 }).select("id").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: data?.id };
}

export async function apagarHabito(id) {
  const { sb, user } = await usuaria();
  if (!user) return { erro: "sessão" };
  await sb.from("lar_habito").update({ ativo: false }).eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
