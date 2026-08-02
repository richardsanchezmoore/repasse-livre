import Link from "next/link";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria } from "@/lib/acessos";
import BotaoCompra from "@/components/BotaoCompra";

export const dynamic = "force-dynamic";
export const metadata = { title: "O Salão · Damas Virtuosas" };

export default async function Salao() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/salao");

  const sb = await criarSupabaseServer();
  const [acessos, admin, cfg] = await Promise.all([
    acessosDaUsuaria(sb, user.id),
    ehAdmin(sb, user.id),
    sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle(),
  ]);
  const planos = cfg.data?.valor || {};
  const salaoUrl = planos.salao_whatsapp || "";
  const assinUrl = planos.assinatura?.cakto_url || "";
  const liberado = admin || acessos.has("assinatura");

  return (
    <main className="screen">
      <div className="eyebrow">◈ O Salão ◈</div>
      <h1 className="h-title">O <em>Salão</em> das damas</h1>
      <p className="h-sub">A roda de chá das mulheres que escolheram esperar com sabedoria — não com pressa.</p>

      {liberado ? (
        <section className="card" style={{ marginTop: 18, textAlign: "center" }}>
          <div className="fx-selo" style={{ margin: "0 auto 10px", width: 76, height: 76, fontSize: 34 }}>🍵</div>
          <div className="c-t">Você é uma Dama Virtuosa ✓</div>
          <div className="c-p">Entre no grupo privado e junte-se à conversa das assinantes.</div>
          {salaoUrl
            ? <a href={salaoUrl} className="pill" target="_blank" rel="noopener noreferrer">Entrar no Salão →</a>
            : <p className="muted">O link do grupo será liberado em breve.</p>}
        </section>
      ) : (
        <section className="card" style={{ marginTop: 18, textAlign: "center" }}>
          <div className="pw-lock" style={{ margin: "0 auto 8px" }}>🔒</div>
          <div className="c-t">Exclusivo das assinantes</div>
          <div className="c-p">O Salão é o grupo privado das Damas Virtuosas. Assine e entre na conversa — com quem entende a sua jornada.</div>
          {assinUrl
            ? <BotaoCompra url={assinUrl} className="pill">Assinar as Damas Virtuosas →</BotaoCompra>
            : <Link href="/assinar" className="pill">Conhecer as Damas Virtuosas →</Link>}
        </section>
      )}

      <hr className="divider" />
      <p className="muted">Uma dama sábia caminha acompanhada. — Lady do Altar</p>
    </main>
  );
}
