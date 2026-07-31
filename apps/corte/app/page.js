import Link from "next/link";

export default function Home() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ A Temporada ◈</div>
      <h1 className="h-title">Querida <em>leitora</em>,</h1>
      <p className="h-sub">bem-vinda à Corte. Aqui você aprende a ler os sinais — antes do altar.</p>

      {/* HERÓI: O Dossiê */}
      <Link href="/dossie" className="card hero" style={{ marginTop: 18 }}>
        <div className="c-k">A dinâmica da temporada</div>
        <div className="c-t">O <em>Dossiê</em> 🗂️</div>
        <div className="c-p">Investigue seu pretendente como uma verdadeira Lady Whistledown. Quanto mais você o conhece, mais o Veredito se revela.</div>
        <span className="pill">Abrir um dossiê →</span>
      </Link>

      {/* devocional do dia */}
      <section className="card dark" style={{ marginTop: 14 }}>
        <div className="c-k">Devocional de hoje</div>
        <div className="c-t">"Sobre tudo o que se deve guardar, <em>guarda o teu coração</em>."</div>
        <div className="c-p">Provérbios 4:23 — o discernimento não nasce da desconfiança, mas da intimidade com Deus.</div>
        <Link href="/jornada" className="pill">Abrir a Jornada de hoje →</Link>
      </section>

      <h2 className="sec-h">O seu kit</h2>
      <div className="tiles">
        <Link href="/biblioteca" className="tile">
          <span className="ic">📖</span>
          <div><div className="tt">O Panfleto</div><div className="td">Os 12 perfis a evitar</div></div>
        </Link>
        <Link href="/dossie" className="tile">
          <span className="ic">🛡️</span>
          <div><div className="tt">O Veredito</div><div className="td">Cavalheiro ou libertino?</div></div>
        </Link>
        <Link href="/jornada" className="tile">
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
