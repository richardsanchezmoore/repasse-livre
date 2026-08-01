"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { carregarEsquema } from "@/lib/dossieDb";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria } from "@/lib/acessos";

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
  const avatar = String(formData.get("avatar") || "").trim() || null;
  if (!nome) redirect("/dossie/novo");

  // Grátis (Kit): 1 dossiê. Para o 2º, precisa da assinatura → manda pro upsell em /dossie.
  const [acessos, admin] = await Promise.all([acessosDaUsuaria(sb, user.id), ehAdmin(sb, user.id)]);
  if (!admin && !acessos.has("assinatura")) {
    const { count } = await sb.from("corte_dossies").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count || 0) >= 1) redirect("/dossie");
  }

  await garantirMembro(sb, user);
  const emblema = nome.charAt(0).toUpperCase();
  const { data, error } = await sb
    .from("corte_dossies")
    .insert({ user_id: user.id, nome, igreja, emblema, avatar })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dossie");
  redirect(`/dossie/${data.id}`);
}

/** Salva todas as respostas do dossiê (schema dinâmico), por campo_id. */
/** Salva UMA resposta (autosave do fluxo gamificado). valor: string | array | number | null. */
export async function salvarUmaResposta(dossieId, campoId, valor) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return { erro: "sem sessão" };

  const vazio = valor == null || (Array.isArray(valor) && valor.length === 0) || (typeof valor === "string" && valor.trim() === "");
  if (vazio) {
    await sb.from("corte_respostas").delete().eq("dossie_id", dossieId).eq("campo_id", campoId);
  } else {
    const { error } = await sb.from("corte_respostas").upsert(
      { dossie_id: dossieId, user_id: user.id, campo_id: campoId, valor },
      { onConflict: "dossie_id,campo_id" }
    );
    if (error) return { erro: error.message };
  }
  await sb.from("corte_dossies").update({ atualizado_em: new Date().toISOString() }).eq("id", dossieId);
  revalidatePath("/dossie");
  return { ok: true };
}

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
