import { headers } from "next/headers";
import { exigirAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ConstrutorQuizzes from "@/components/ConstrutorQuizzes";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  await exigirAdmin();
  const admin = supabaseAdmin();
  const { data } = await admin.from("corte_quizzes").select("id, slug, titulo, ativo, raiz, dados").order("atualizado_em", { ascending: false });

  const h = await headers();
  const host = h.get("host") || "damasvirtuosas.com";
  const baseUrl = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  return (
    <main className="screen">
      <div className="eyebrow">◈ Quizzes ◈</div>
      <h1 className="h-title">Criador de <em>quizzes</em></h1>
      <p className="h-sub">Crie e edite os quizzes do funil público. Aponte o anúncio pra <code>/investigar?q=slug</code> (ou <code>/investigar</code> pro ativo). Dá pra ter vários pra testar (A/B).</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorQuizzes quizzes={data || []} baseUrl={baseUrl} />
      </div>
    </main>
  );
}
