import Link from "next/link";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria } from "@/lib/acessos";
import { carregarEsquema, totalCampos, nivel } from "@/lib/dossieDb";
import Avatar from "@/components/Avatar";
import BotaoCompra from "@/components/BotaoCompra";

export const metadata = { title: "O Dossiê · Damas Virtuosas" };
export const dynamic = "force-dynamic";

export default async function DossiePage() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/dossie");

  const sb = await criarSupabaseServer();
  const [{ data: dossies }, esquema, acessos, admin, { data: cfg }] = await Promise.all([
    sb.from("corte_dossies").select("id, nome, igreja, emblema, avatar, atualizado_em").order("atualizado_em", { ascending: false }),
    carregarEsquema(sb),
    acessosDaUsuaria(sb, user.id),
    ehAdmin(sb, user.id),
    sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle(),
  ]);
  const total = totalCampos(esquema);
  const assin = cfg?.valor?.assinatura || {};
  const ehAssinante = admin || acessos.has("assinatura");
  // Grátis (Kit): 1 dossiê. Para o 2º, entra pra Comunidade (assinatura).
  const podeCriar = ehAssinante || (dossies?.length || 0) < 1;

  const ids = (dossies || []).map((d) => d.id);
  let contagem = {};
  if (ids.length) {
    const { data: respostas } = await sb.from("corte_respostas").select("dossie_id").in("dossie_id", ids).not("campo_id", "is", null);
    for (const r of respostas || []) contagem[r.dossie_id] = (contagem[r.dossie_id] || 0) + 1;
  }

  return (
    <main className="screen">
      <div className="eyebrow">◈ Os seus dossiês ◈</div>
      <h1 className="h-title">O <em>Dossiê</em></h1>
      <p className="h-sub">Toda dama sábia investiga antes de entregar o coração. Abra um dossiê e conheça-o de verdade.</p>

      {podeCriar ? (
        <Link href="/dossie/novo" className="pill" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
          ✒️ Novo pretendente
        </Link>
      ) : (
        <section className="card dark" style={{ marginTop: 16, textAlign: "center" }}>
          <div className="c-k">✦ Mais de um pretendente?</div>
          <div className="c-t">Investigue <em>quantos</em> quiser</div>
          <div className="c-p">
            No Kit você acompanha um dossiê. Entre para as <strong>Damas Virtuosas</strong> e abra dossiês ilimitados — e em breve compare os pretendentes lado a lado para ver quem realmente vale o seu altar.
          </div>
          {assin.cakto_url
            ? <BotaoCompra url={assin.cakto_url} className="pill">{assin.trial_dias ? `Começar ${assin.trial_dias} dias grátis` : "Entrar para a Comunidade"}{assin.preco ? ` · ${assin.preco}` : ""} →</BotaoCompra>
            : <Link href="/assinar" className="pill">Conhecer as Damas Virtuosas →</Link>}
        </section>
      )}

      {(!dossies || dossies.length === 0) ? (
        <p className="muted" style={{ marginTop: 22 }}>Nenhum pretendente em investigação ainda. Comece pelo primeiro nome que passou pela sua cabeça 👀</p>
      ) : (
        <div className="shelf" style={{ marginTop: 18 }}>
          {dossies.map((d) => {
            const n = nivel(contagem[d.id] || 0, total);
            return (
              <Link key={d.id} href={`/dossie/${d.id}`} className="row">
                {d.avatar ? <Avatar id={d.avatar} size={44} /> : <div className="ri">{d.emblema || "♟"}</div>}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="rt">{d.nome}</div>
                  <div className="rd">{d.igreja || "igreja não informada"} · {n.selo}</div>
                  <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${n.pct}%` }} /></div>
                </div>
                <div className="rgo">›</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
