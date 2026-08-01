import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria, temAcesso } from "@/lib/acessos";
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

  const [acessos, admin] = await Promise.all([acessosDaUsuaria(sb, user.id), ehAdmin(sb, user.id)]);
  const aberto = admin || temAcesso(acessos, m.acesso);

  if (!aberto) {
    const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const planos = cfg?.valor || {};
    const plano = m.acesso === "assinatura" ? planos.assinatura : planos.kit;
    const url = plano?.cakto_url || "";
    return (
      <main className="screen">
        <Link href="/biblioteca" className="muted" style={{ display: "block", textAlign: "left", padding: 0, marginBottom: 10 }}>← biblioteca</Link>
        <div className="paywall">
          <div className="pw-lock">🔒</div>
          <span className="ld-ic">{m.icone || "📖"}</span>
          <h1 className="h-title" style={{ textAlign: "center" }}>{m.titulo}</h1>
          {m.subtitulo && <p className="h-sub" style={{ textAlign: "center" }}>{m.subtitulo}</p>}
          <p className="pw-msg">
            Este tesouro faz parte {m.acesso === "assinatura" ? "d’A Corte (assinatura)" : "do Kit da Temporada"}.
            Libere o seu acesso e leia agora mesmo.
          </p>
          {url ? (
            <a href={url} className="pill" target="_blank" rel="noopener noreferrer">
              Liberar {plano?.preco ? `· ${plano.preco}` : "acesso"} →
            </a>
          ) : (
            <p className="muted">Link de compra ainda não configurado no painel.</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="screen leitor">
      <Link href="/biblioteca" className="muted" style={{ display: "block", textAlign: "left", padding: 0, marginBottom: 10 }}>← biblioteca</Link>
      <div className="livro">
        <div className="ld-head">
          <span className="ld-ic">{m.icone || "📖"}</span>
          <h1 className="h-title" style={{ fontSize: 27 }}>{m.titulo}</h1>
          {m.subtitulo && <p className="h-sub" style={{ marginTop: 4 }}>{m.subtitulo}</p>}
        </div>
        <article className="leitura" dangerouslySetInnerHTML={{ __html: mdParaHtml(m.corpo) }} />
      </div>
      <Link href="/biblioteca" className="muted" style={{ display: "block", marginTop: 16 }}>← voltar ao acervo</Link>
    </main>
  );
}
