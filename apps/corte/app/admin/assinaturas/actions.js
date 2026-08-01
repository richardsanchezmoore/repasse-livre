"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";

async function garantirAdmin(sb) {
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Sem sessão.");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", data.user.id).maybeSingle();
  if (!m?.is_admin) throw new Error("Acesso restrito ao admin.");
}

export async function salvarPlanos(planos) {
  const sb = await criarSupabaseServer();
  await garantirAdmin(sb);
  const { error } = await sb.from("corte_config").upsert(
    { chave: "planos", valor: planos, atualizado_em: new Date().toISOString() },
    { onConflict: "chave" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/assinaturas");
  revalidatePath("/perfil");
}
