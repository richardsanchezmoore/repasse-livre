"use server";

import { revalidatePath } from "next/cache";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { QUIZ } from "@/lib/quiz";

async function ctx() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Sem sessão.");
  const { data: m } = await sb.from("corte_membros").select("is_admin").eq("user_id", data.user.id).maybeSingle();
  if (!m?.is_admin) throw new Error("Acesso restrito ao admin.");
}
function refresh() { revalidatePath("/admin/quizzes"); revalidatePath("/investigar"); }

function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function limparDados(d) {
  const questoes = (Array.isArray(d?.questoes) ? d.questoes : []).map((q) => ({
    t: String(q?.t || "").trim(),
    opcoes: (Array.isArray(q?.opcoes) ? q.opcoes : []).map((o) => ({ t: String(o?.t || "").trim(), p: Number(o?.p) || 0 })).filter((o) => o.t),
  })).filter((q) => q.t && q.opcoes.length);
  const max = questoes.reduce((a, q) => a + Math.max(0, ...q.opcoes.map((o) => o.p)), 0);
  const faixas = (Array.isArray(d?.faixas) ? d.faixas : []).map((f) => ({
    min: Number(f?.min) || 0,
    cls: ["green", "amber", "red"].includes(f?.cls) ? f.cls : "amber",
    titulo: String(f?.titulo || "").trim(),
    texto: String(f?.texto || "").trim(),
  })).filter((f) => f.titulo);
  return { lead: String(d?.lead || "").trim(), max, questoes, faixas };
}

export async function novoQuiz() {
  await ctx();
  const admin = supabaseAdmin();
  const base = { lead: QUIZ.lead, max: QUIZ.max, questoes: QUIZ.questoes, faixas: QUIZ.faixas };
  let slug = "novo-quiz";
  for (let i = 0; i < 60; i++) {
    const cand = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await admin.from("corte_quizzes").select("id").eq("slug", cand).maybeSingle();
    if (!data) { slug = cand; break; }
  }
  const { error } = await admin.from("corte_quizzes").insert({ slug, titulo: "Novo quiz (rascunho)", ativo: false, dados: base });
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}

export async function salvarQuiz(id, { slug, titulo, dados }) {
  await ctx();
  const admin = supabaseAdmin();
  const s = slugify(slug || titulo);
  if (!s) return { erro: "Informe um slug/título válido." };
  if (!String(titulo || "").trim()) return { erro: "Dê um título ao quiz." };
  const { data: outro } = await admin.from("corte_quizzes").select("id").eq("slug", s).neq("id", id).maybeSingle();
  if (outro) return { erro: "Já existe um quiz com esse slug." };
  const clean = limparDados(dados);
  if (!clean.questoes.length) return { erro: "Adicione ao menos uma questão com opções." };
  const { error } = await admin.from("corte_quizzes").update({ slug: s, titulo: String(titulo).trim(), dados: clean, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: error.message };
  refresh();
  return { ok: true, slug: s };
}

export async function alternarAtivoQuiz(id, val) {
  await ctx();
  await supabaseAdmin().from("corte_quizzes").update({ ativo: !!val, atualizado_em: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function excluirQuiz(id) {
  await ctx();
  await supabaseAdmin().from("corte_quizzes").delete().eq("id", id);
  refresh();
}
