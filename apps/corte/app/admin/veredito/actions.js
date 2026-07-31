"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";

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
  revalidatePath("/admin/veredito");
  revalidatePath("/dossie");
}
function limparValor(condicao, valor) {
  if (condicao === "faixa") return { min: Number(valor?.min ?? 0), max: Number(valor?.max ?? 0) };
  if (["igual", "diferente", "contem", "nao_contem"].includes(condicao)) return { opcao: String(valor?.opcao ?? "").trim() };
  return null;
}

export async function criarRegra(d) {
  const { sb } = await ctx();
  const { data: ult } = await sb.from("corte_regras").select("ordem").order("ordem", { ascending: false }).limit(1);
  const ordem = (ult?.[0]?.ordem ?? -1) + 1;
  const { error } = await sb.from("corte_regras").insert({
    campo_id: d.campo_id,
    condicao: d.condicao,
    valor: limparValor(d.condicao, d.valor),
    pontos: Number(d.pontos ?? 0),
    bandeira: d.bandeira || "neutro",
    mensagem: String(d.mensagem || "").trim() || null,
    ordem,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function atualizarRegra(id, d) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_regras").update({
    campo_id: d.campo_id,
    condicao: d.condicao,
    valor: limparValor(d.condicao, d.valor),
    pontos: Number(d.pontos ?? 0),
    bandeira: d.bandeira || "neutro",
    mensagem: String(d.mensagem || "").trim() || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function excluirRegra(id) {
  const { sb } = await ctx();
  const { error } = await sb.from("corte_regras").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function salvarFaixas(faixas) {
  const { sb } = await ctx();
  const limpas = (faixas || [])
    .map((f) => ({ ate: Number(f.ate), rotulo: String(f.rotulo || "").trim(), bandeira: f.bandeira || "neutro", mensagem: String(f.mensagem || "").trim() }))
    .filter((f) => f.rotulo);
  const { error } = await sb.from("corte_config").upsert(
    { chave: "veredito_faixas", valor: limpas, atualizado_em: new Date().toISOString() },
    { onConflict: "chave" }
  );
  if (error) throw new Error(error.message);
  refresh();
}
