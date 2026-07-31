"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { carregarEsquema } from "@/lib/dossieDb";

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

/** Salva todas as respostas do dossiê (schema dinâmico), por campo_id. */
export async function salvarRespostas(dossieId, formData) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/entrar");

  const esquema = await carregarEsquema(sb);
  const upserts = [];
  const apagar = [];

  for (const etapa of esquema) {
    for (const campo of etapa.campos) {
      const name = `c_${campo.id}`;
      let valor, vazio;
      if (campo.tipo === "checkbox") {
        const arr = formData.getAll(name).map(String).filter((s) => s.length);
        valor = arr; vazio = arr.length === 0;
      } else if (campo.tipo === "slider") {
        const raw = formData.get(name);
        vazio = raw == null || String(raw) === "";
        valor = vazio ? null : Number(raw);
      } else {
        const raw = String(formData.get(name) ?? "").trim();
        vazio = raw.length === 0;
        valor = raw;
      }
      if (vazio) apagar.push(campo.id);
      else upserts.push({ dossie_id: dossieId, user_id: user.id, campo_id: campo.id, capitulo: etapa.chave, campo: campo.chave, valor });
    }
  }

  if (upserts.length) {
    const { error } = await sb.from("corte_respostas").upsert(upserts, { onConflict: "dossie_id,campo_id" });
    if (error) throw new Error(error.message);
  }
  if (apagar.length) {
    await sb.from("corte_respostas").delete().eq("dossie_id", dossieId).in("campo_id", apagar);
  }
  await sb.from("corte_dossies").update({ atualizado_em: new Date().toISOString() }).eq("id", dossieId);
  revalidatePath(`/dossie/${dossieId}`);
  revalidatePath("/dossie");
}
