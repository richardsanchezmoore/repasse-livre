import QuizPublico from "@/components/QuizPublico";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { QUIZ } from "@/lib/quiz";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "O Veredito Real — Ele é Cavalheiro ou Libertino? · Damas Virtuosas",
  description: "Responda o quiz e descubra o Veredito sobre o seu pretendente.",
};

const DEFAULT_SLUG = "cavalheiro-ou-libertino";

// Funil público (sem login): busca o quiz no banco. ?q=<slug> escolhe um específico
// (A/B); sem param, pega um ativo. Sem quiz no banco → cai no hardcode (lib/quiz).
export default async function InvestigarPage({ searchParams }) {
  const slug = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const admin = supabaseAdmin();

  let row = null;
  if (slug) {
    const { data } = await admin.from("corte_quizzes").select("slug, titulo, dados").eq("slug", slug).eq("ativo", true).maybeSingle();
    row = data;
  } else {
    const { data } = await admin.from("corte_quizzes").select("slug, titulo, dados").eq("ativo", true).order("atualizado_em", { ascending: false }).limit(1);
    row = data?.[0] || null;
  }

  let quiz = row ? { slug: row.slug, titulo: row.titulo, ...(row.dados || {}) } : null;
  if (!quiz || !Array.isArray(quiz.questoes) || quiz.questoes.length === 0) {
    quiz = { slug: DEFAULT_SLUG, titulo: QUIZ.titulo, lead: QUIZ.lead, max: QUIZ.max, questoes: QUIZ.questoes, faixas: QUIZ.faixas };
  }

  return <QuizPublico quiz={quiz} />;
}
