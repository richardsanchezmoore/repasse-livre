"use server";
import { criarSupabaseServer } from "@/lib/supabaseServer";

function segundaDaSemana(base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Salva o placar (sugestões + estrelas marcadas). Estado semanal (reset toda segunda). */
export async function salvarPlacar({ dados, marcados, estrelas }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { erro: "Entre na sua conta pra salvar." };
  const { error } = await sb.from("lar_placar").upsert(
    {
      user_id: auth.user.id,
      dados: dados ?? {},
      marcados: marcados ?? {},
      estrelas: Number.isFinite(+estrelas) ? Math.max(0, Math.trunc(+estrelas)) : 0,
      semana: segundaDaSemana(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return { erro: error.message };
  return { ok: true };
}
