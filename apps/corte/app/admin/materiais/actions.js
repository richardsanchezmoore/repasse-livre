"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { slugChave } from "@/lib/dossieDb";

async function ctx() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Sem sessão.");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!m?.is_admin) throw new Error("Acesso restrito ao admin.");
  return { sb };
}
function refresh(chave) {
  revalidatePath("/admin/materiais");
  revalidatePath("/biblioteca");
  if (chave) revalidatePath(`/biblioteca/${chave}`);
}

export async function criarMaterial(d) {
  const { sb } = await ctx();
  const titulo = String(d.titulo || "").trim();
  if (!titulo) return;
  const base = slugChave(titulo);
  const { data: existe } = await sb.from("corte_materiais").select("chave");
  const usadas = new Set((existe || []).map((r) => r.chave));
  let chave = base, i = 2;
  while (usadas.has(chave)) chave = `${base}_${i++}`;
  const { data: ult } = await sb.from("corte_materiais").select("ordem").order("ordem", { ascending: false }).limit(1);
  const ordem = (ult?.[0]?.ordem ?? -1) + 1;
  const { error } = await sb.from("corte_materiais").insert({
    chave, titulo,
    subtitulo: String(d.subtitulo || "").trim() || null,
    tipo: d.tipo || "bonus",
    icone: String(d.icone || "").trim() || null,
    acesso: d.acesso || "kit",
    corpo: String(d.corpo || ""),
    ordem,
  });
  if (error) throw new Error(error.message);
  refresh(chave);
}

export async function atualizarMaterial(id, d) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_materiais").update({
    titulo: String(d.titulo || "").trim(),
    subtitulo: String(d.subtitulo || "").trim() || null,
    tipo: d.tipo || "bonus",
    icone: String(d.icone || "").trim() || null,
    acesso: d.acesso || "kit",
    corpo: String(d.corpo || ""),
    atualizado_em: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(d.chave);
}

export async function alternarAtivoMaterial(id, ativo) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_materiais").update({ ativo: !!ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function excluirMaterial(id) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_materiais").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
