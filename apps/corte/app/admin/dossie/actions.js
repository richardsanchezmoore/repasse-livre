"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { slugChave, tipoUsaOpcoes } from "@/lib/dossieDb";

async function ctx() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Sem sessão.");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!m?.is_admin) throw new Error("Acesso restrito ao admin.");
  return { sb, user };
}

function refresh() {
  revalidatePath("/admin/dossie");
  revalidatePath("/dossie");
}

async function proximaOrdem(sb, tabela, filtro) {
  let q = sb.from(tabela).select("ordem").order("ordem", { ascending: false }).limit(1);
  if (filtro) q = q.eq(filtro.col, filtro.val);
  const { data } = await q;
  return (data?.[0]?.ordem ?? -1) + 1;
}

async function chaveUnica(sb, etapaId, base) {
  const { data } = await sb.from("corte_campos").select("chave").eq("etapa_id", etapaId);
  const usadas = new Set((data || []).map((r) => r.chave));
  let chave = base, i = 2;
  while (usadas.has(chave)) chave = `${base}_${i++}`;
  return chave;
}

function montarConfig(tipo, d) {
  const cfg = {};
  if (tipoUsaOpcoes(tipo)) {
    cfg.opcoes = (d.opcoes || []).map((o) => String(o).trim()).filter(Boolean);
    if (tipo === "checkbox") cfg.multipla = true;
  }
  if (tipo === "slider") {
    cfg.min = Number(d.min ?? 0); cfg.max = Number(d.max ?? 10); cfg.passo = Number(d.passo ?? 1);
    if (d.unidade) cfg.unidade = String(d.unidade).trim();
  }
  if (d.placeholder) cfg.placeholder = String(d.placeholder).trim();
  if (d.dica) cfg.dica = String(d.dica).trim();
  return cfg;
}

// ── Etapas ──────────────────────────────────────────────────────────────────
export async function criarEtapa(d) {
  const { sb } = await ctx();
  const titulo = String(d.titulo || "").trim();
  if (!titulo) return;
  const ordem = await proximaOrdem(sb, "corte_etapas");
  const base = slugChave(titulo);
  const { data } = await sb.from("corte_etapas").select("chave").eq("chave", base);
  const chave = data?.length ? `${base}_${ordem}` : base;
  const { error } = await sb.from("corte_etapas").insert({ chave, titulo, icone: String(d.icone || "").trim() || null, ordem });
  if (error) throw new Error(error.message);
  refresh();
}

export async function editarEtapa(id, d) {
  const { sb } = await ctx();
  const patch = {};
  if (d.titulo != null) patch.titulo = String(d.titulo).trim();
  if (d.icone != null) patch.icone = String(d.icone).trim() || null;
  if (d.ativo != null) patch.ativo = !!d.ativo;
  const { error } = await sb.from("corte_etapas").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function excluirEtapa(id) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_etapas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function reordenarEtapas(idsEmOrdem) {
  const { sb } = await ctx();
  await Promise.all(idsEmOrdem.map((id, i) => sb.from("corte_etapas").update({ ordem: i }).eq("id", id)));
  refresh();
}

// ── Campos ──────────────────────────────────────────────────────────────────
export async function criarCampo(etapaId, d) {
  const { sb } = await ctx();
  const rotulo = String(d.rotulo || "").trim();
  const tipo = String(d.tipo || "input");
  if (!rotulo) return;
  const chave = await chaveUnica(sb, etapaId, slugChave(rotulo));
  const ordem = await proximaOrdem(sb, "corte_campos", { col: "etapa_id", val: etapaId });
  const { error } = await sb.from("corte_campos").insert({
    etapa_id: etapaId, chave, rotulo, tipo, config: montarConfig(tipo, d),
    ordem, obrigatorio: !!d.obrigatorio, peso: Number(d.peso ?? 1),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function atualizarCampo(id, d) {
  const { sb } = await ctx();
  const tipo = String(d.tipo || "input");
  const patch = {
    rotulo: String(d.rotulo || "").trim(),
    tipo,
    config: montarConfig(tipo, d),
    obrigatorio: !!d.obrigatorio,
  };
  if (d.peso != null) patch.peso = Number(d.peso);
  const { error } = await sb.from("corte_campos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function alternarAtivoCampo(id, ativo) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_campos").update({ ativo: !!ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function excluirCampo(id) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_campos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function reordenarCampos(idsEmOrdem) {
  const { sb } = await ctx();
  await Promise.all(idsEmOrdem.map((id, i) => sb.from("corte_campos").update({ ordem: i }).eq("id", id)));
  refresh();
}
