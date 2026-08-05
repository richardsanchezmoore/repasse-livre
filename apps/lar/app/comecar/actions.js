"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";

/** Salva o perfil da família (a base que a Marta usa pra personalizar tudo). */
export async function salvarFamilia(dados) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const filhos = (Array.isArray(dados?.filhos) ? dados.filhos : [])
    .map((f) => ({ nome: String(f?.nome || "").trim(), idade: f?.idade != null ? Number(f.idade) : null }))
    .filter((f) => f.nome || f.idade != null)
    .slice(0, 12);

  const linha = {
    user_id: user.id,
    nome_mae: String(dados?.nome_mae || "").trim() || null,
    filhos,
    comodos: dados?.comodos != null ? Number(dados.comodos) : null,
    trabalha_fora: !!dados?.trabalha_fora,
    restricoes: String(dados?.restricoes || "").trim() || null,
    observacoes: String(dados?.observacoes || "").trim() || null,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await sb.from("lar_familia").upsert(linha, { onConflict: "user_id" });
  if (error) return { erro: error.message };
  redirect("/");
}
