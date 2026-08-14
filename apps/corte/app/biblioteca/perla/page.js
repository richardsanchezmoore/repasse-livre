import Link from "next/link";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria, temAcesso } from "@/lib/acessos";
import BotaoCompra from "@/components/BotaoCompra";
import LeitorPerla from "./LeitorPerla";

// Rota ESTÁTICA "perla" — vence a dinâmica [chave]. A obra vive em
// corte_materiais (chave='perla') só para listagem + gate; o corpo é a
// experiência interativa (LeitorPerla), não markdown.
export const dynamic = "force-dynamic";
export const metadata = { title: "Como se Tornar a Mulher que Ele Procura · Damas Virtuosas" };

const CHAVE = "perla";

export default async function PaginaPerla({ searchParams }) {
  // Bypass só em desenvolvimento (?preview=1) — em produção o gate é soberano.
  const preview = process.env.NODE_ENV !== "production" && searchParams?.preview === "1";
  if (preview) return <Leitura />;

  const user = await usuariaAtual();
  if (!user) redirect(`/entrar?redirect=/biblioteca/${CHAVE}`);

  const sb = await criarSupabaseServer();
  const { data: m } = await sb
    .from("corte_materiais")
    .select("titulo, subtitulo, icone, acesso, ativo")
    .eq("chave", CHAVE)
    .maybeSingle();

  const [acessos, admin] = await Promise.all([acessosDaUsuaria(sb, user.id), ehAdmin(sb, user.id)]);
  // acesso padrão 'kit' enquanto a linha não existe no banco.
  const nivel = m?.acesso || "kit";
  const aberto = admin || temAcesso(acessos, nivel);

  if (!aberto) {
    const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const planos = cfg?.valor || {};
    const plano = nivel === "assinatura" ? planos.assinatura
      : nivel === "livro" ? (planos.livro?.cakto_url ? planos.livro : planos.kit)
      : planos.kit;
    const url = plano?.cakto_url || "";
    return (
      <main className="screen">
        <Link href="/biblioteca" className="muted" style={{ display: "block", textAlign: "left", padding: 0, marginBottom: 10 }}>← biblioteca</Link>
        <div className="paywall">
          <div className="pw-lock">🔒</div>
          <span className="ld-ic">{m?.icone || "🔑"}</span>
          <h1 className="h-title" style={{ textAlign: "center" }}>{m?.titulo || "Como se Tornar a Mulher que Ele Procura"}</h1>
          <p className="h-sub" style={{ textAlign: "center" }}>{m?.subtitulo || "O método PERLA."}</p>
          <p className="pw-msg">
            Este tesouro faz parte {nivel === "assinatura" ? "das Damas Virtuosas (assinatura)" : "do Kit da Temporada"}.
            Libere o seu acesso e leia agora mesmo.
          </p>
          {url ? (
            <BotaoCompra url={url} className="pill">Liberar {plano?.preco ? `· ${plano.preco}` : "acesso"} →</BotaoCompra>
          ) : (
            <p className="muted">Link de compra ainda não configurado no painel.</p>
          )}
        </div>
      </main>
    );
  }

  return <Leitura />;
}

function Leitura() {
  return (
    <main className="perla-main">
      <Link href="/biblioteca" className="perla-back">← biblioteca</Link>
      <LeitorPerla />
    </main>
  );
}
