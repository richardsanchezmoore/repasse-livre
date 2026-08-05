"use server";
import { criarSupabaseServer } from "@/lib/supabaseServer";

/** Salva a rotina da casa (um estado atual por usuária). */
export async function salvarRotina(dados) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { erro: "Entre na sua conta pra salvar." };
  const { error } = await sb.from("lar_rotina").upsert(
    { user_id: auth.user.id, dados, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { erro: error.message };
  return { ok: true };
}
