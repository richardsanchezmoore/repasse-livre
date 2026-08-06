"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

/** Salva um compromisso na agenda da casa. */
export async function salvarEvento({ titulo, quem, cor, data, hora, repete, observacao }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Entre na sua conta." };

  const t = String(titulo || "").trim().slice(0, 120);
  if (!t) return { erro: "Dê um nome ao compromisso. 💛" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ""))) return { erro: "Escolha o dia." };

  const linha = {
    user_id: user.id,
    titulo: t,
    quem: String(quem || "").slice(0, 40) || null,
    cor: String(cor || "").slice(0, 12) || null,
    data,
    hora: hora ? String(hora).slice(0, 5) : null,
    repete: repete === "semanal" ? "semanal" : "nao",
    observacao: String(observacao || "").trim().slice(0, 300) || null,
  };
  const { data: novo, error } = await sb.from("lar_agenda").insert(linha).select("id").maybeSingle();
  if (error) return { erro: error.message };
  return { ok: true, id: novo?.id };
}

/** Apaga um compromisso. */
export async function apagarEvento(id) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { erro: "sessão" };
  await sb.from("lar_agenda").delete().eq("id", id).eq("user_id", auth.user.id);
  return { ok: true };
}
