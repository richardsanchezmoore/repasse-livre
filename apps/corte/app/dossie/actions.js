"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { CAPITULOS } from "@/lib/dossie";

/** Garante uma linha em corte_membros pra usuária (perfil n'A Corte). */
async function garantirMembro(sb, user) {
  await sb.from("corte_membros").upsert(
    { user_id: user.id, nome: user.user_metadata?.nome ?? null },
    { onConflict: "user_id" }
  );
}

/** Cria um novo pretendente (dossiê) e leva a usuária pra ficha dele. */
export async function criarDossie(formData) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/entrar?redirect=/dossie/novo");

  const nome = String(formData.get("nome") || "").trim();
  const igreja = String(formData.get("igreja") || "").trim() || null;
  if (!nome) redirect("/dossie/novo");

  await garantirMembro(sb, user);

  const emblema = nome.charAt(0).toUpperCase();
  const { data, error } = await sb
    .from("corte_dossies")
    .insert({ user_id: user.id, nome, igreja, emblema })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dossie");
  redirect(`/dossie/${data.id}`);
}

/** Salva (upsert) todas as respostas dos capítulos de uma vez. */
export async function salvarRespostas(dossieId, formData) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/entrar");

  const linhas = [];
  for (const cap of CAPITULOS) {
    for (const campo of cap.campos) {
      const chave = `resp__${cap.id}__${campo.id}`;
      const valor = String(formData.get(chave) ?? "").trim();
      if (valor.length === 0) continue; // não grava vazio (mantém como missão)
      linhas.push({
        dossie_id: dossieId,
        user_id: user.id,
        capitulo: cap.id,
        campo: campo.id,
        valor: valor,
      });
    }
  }

  if (linhas.length > 0) {
    const { error } = await sb
      .from("corte_respostas")
      .upsert(linhas, { onConflict: "dossie_id,capitulo,campo" });
    if (error) throw new Error(error.message);
  }

  await sb.from("corte_dossies").update({ atualizado_em: new Date().toISOString() }).eq("id", dossieId);
  revalidatePath(`/dossie/${dossieId}`);
  revalidatePath("/dossie");
}
