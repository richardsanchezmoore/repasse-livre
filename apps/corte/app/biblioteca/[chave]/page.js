import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { mdParaHtml } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const sb = await criarSupabaseServer();
  const { data: m } = await sb.from("corte_materiais").select("titulo").eq("chave", params.chave).maybeSingle();
  return { title: m ? `${m.titulo} · A Corte` : "Leitura · A Corte" };
}

export default async function Leitor({ params }) {
  const user = await usuariaAtual();
  if (!user) redirect(`/entrar?redirect=/biblioteca/${params.chave}`);

  const sb = await criarSupabaseServer();
  const { data: m } = await sb.from("corte_materiais").select("*").eq("chave", params.chave).eq("ativo", true).maybeSingle();
  if (!m) notFound();

  return (
    <main className="screen">
      <Link href="/biblioteca" className="muted" style={{ display: "block", textAlign: "left", padding: 0, marginBottom: 10 }}>← biblioteca</Link>
      <div className="ld-head">
        <span className="ld-ic">{m.icone || "📖"}</span>
        <h1 className="h-title" style={{ fontSize: 27 }}>{m.titulo}</h1>
        {m.subtitulo && <p className="h-sub" style={{ marginTop: 4 }}>{m.subtitulo}</p>}
      </div>
      <article className="leitura" dangerouslySetInnerHTML={{ __html: mdParaHtml(m.corpo) }} />
      <hr className="divider" />
      <Link href="/biblioteca" className="muted" style={{ display: "block" }}>← voltar ao acervo</Link>
    </main>
  );
}
