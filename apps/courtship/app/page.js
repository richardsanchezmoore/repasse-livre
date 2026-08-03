import { criarSupabaseServer } from "@/lib/supabaseServer";
import { acessosDaUsuaria } from "@/lib/acessos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const acessos = user ? await acessosDaUsuaria(sb, user.id) : new Set();
  const temKit = acessos.has("kit") || acessos.has("assinatura");

  return (
    <main className="screen">
      <div className="eyebrow">◈ The Season ◈</div>
      <h1 className="h-title">Dear <em>reader</em>,</h1>
      <p className="h-sub">welcome to The Courtship Almanac. Here you learn to read the signs — before the altar.</p>

      {temKit ? (
        <>
          <section className="card dark" style={{ marginTop: 18 }}>
            <div className="c-k">Your access is active ✧</div>
            <div className="c-t">Your Discernment Kit is being prepared</div>
            <p className="c-p">The full interactive experience (the Almanac, the Dossier, the Verdict and the Journal) is on its way. You'll find it all right here — no app to install.</p>
          </section>

          <h2 className="sec-h">Your kit</h2>
          <div className="tiles">
            <div className="tile"><span className="ic">📖</span><div><div className="tt">The Almanac</div><div className="td">The 12 to recognize</div></div></div>
            <div className="tile"><span className="ic">🔎</span><div><div className="tt">The Dossier</div><div className="td">Investigate your suitor</div></div></div>
            <div className="tile"><span className="ic">⚖️</span><div><div className="tt">The Verdict</div><div className="td">Gentleman or rake?</div></div></div>
            <div className="tile"><span className="ic">📿</span><div><div className="tt">The Journal</div><div className="td">A private space</div></div></div>
          </div>
        </>
      ) : (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="c-k">✦ The Discernment Kit</div>
          <div className="c-t">Learn to read the signs — before the altar.</div>
          <p className="c-p">The 12 kinds of suitors Scripture warns against, plus the tools to weigh your own — for a one-time price.</p>
          <a href="/almanac" className="pill" style={{ marginTop: 14 }}>See the Kit →</a>
        </section>
      )}

      <hr className="divider" />
      <p className="muted">Yours, in pursuit of the biblical scandal — The Lady of the Altar</p>
    </main>
  );
}
