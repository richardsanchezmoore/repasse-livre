import Link from "next/link";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { acessosDaUsuaria } from "@/lib/acessos";
import BotaoCompra from "@/components/BotaoCompra";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const [acessos, cfg] = await Promise.all([
    user ? acessosDaUsuaria(sb, user.id) : new Set(),
    sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle(),
  ]);
  const planos = cfg.data?.valor || {};
  const semKit = !acessos.has("kit") && !acessos.has("assinatura");
  const semAssin = !acessos.has("assinatura");
  const oferta = semKit ? { p: planos.kit, tag: "A porta de entrada" }
    : semAssin ? { p: planos.assinatura, tag: "Vá além" }
    : null;

  return (
    <main className="screen">
      <div className="eyebrow">◈ A Temporada ◈</div>
      <h1 className="h-title">Querida <em>leitora</em>,</h1>
      <p className="h-sub">bem-vinda à Corte. Aqui você aprende a ler os sinais — antes do altar.</p>

      <Link href="/dossie" className="card hero" style={{ marginTop: 18 }}>
        <div className="c-k">A dinâmica da temporada</div>
        <div className="c-t">O <em>Dossiê</em> 🗂️</div>
        <div className="c-p">Investigue seu pretendente como uma verdadeira Lady Whistledown. Quanto mais você o conhece, mais o Veredito se revela.</div>
        <span className="pill">Abrir um dossiê →</span>
      </Link>

      <section className="card dark" style={{ marginTop: 14 }}>
        <div className="c-k">Devocional de hoje</div>
        <div className="c-t">"Sobre tudo o que se deve guardar, <em>guarda o teu coração</em>."</div>
        <div className="c-p">Provérbios 4:23 — o discernimento não nasce da desconfiança, mas da intimidade com Deus.</div>
        <Link href="/jornada" className="pill">Abrir a Jornada de hoje →</Link>
      </section>

      {oferta?.p?.cakto_url && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="c-k">✦ {oferta.tag}</div>
          <div className="c-t">{oferta.p.nome}{oferta.p.preco ? <em> · {oferta.p.preco}</em> : null}</div>
          <div className="c-p">{oferta.p.descricao}</div>
          <BotaoCompra url={oferta.p.cakto_url} className="pill">
            {oferta.p.trial_dias ? `Começar ${oferta.p.trial_dias} dias grátis` : "Liberar agora"} →
          </BotaoCompra>
        </section>
      )}

      <h2 className="sec-h">O seu kit</h2>
      <div className="tiles">
        <Link href="/biblioteca" className="tile">
          <span className="ic">📖</span>
          <div><div className="tt">O Panfleto</div><div className="td">Os 12 perfis a evitar</div></div>
        </Link>
        <Link href="/quiz" className="tile">
          <span className="ic">🛡️</span>
          <div><div className="tt">O Veredito</div><div className="td">Cavalheiro ou libertino?</div></div>
        </Link>
        <Link href="/biblioteca/diario" className="tile">
          <span className="ic">📿</span>
          <div><div className="tt">Diário da Dama</div><div className="td">7 noites de discernimento</div></div>
        </Link>
        <Link href="/salao" className="tile">
          <span className="ic">🍵</span>
          <div><div className="tt">O Salão</div><div className="td">A comunidade das damas</div></div>
        </Link>
      </div>

      <hr className="divider" />
      <p className="muted">Sua, na busca pelo escândalo bíblico — Lady Whistledown do Altar</p>
    </main>
  );
}
