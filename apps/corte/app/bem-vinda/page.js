import BemVindaAcesso from "@/components/BemVindaAcesso";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bem-vinda à Corte" };

export default function BemVinda({ searchParams }) {
  const email = typeof searchParams?.email === "string" ? searchParams.email : "";
  return (
    <main className="lp">
      <div className="lp-hero">
        <div className="eyebrow">◈ Compra confirmada ◈</div>
        <h1 className="lp-title">Bem-vinda à <em>Corte</em>, dama.</h1>
        <p className="lp-sub">Sua conta e o seu <strong>Kit</strong> já estão prontos. Crie uma senha e entre <em>na hora</em> — sem esperar e-mail.</p>
      </div>

      <section className="card" style={{ margin: "6px 18px" }}>
        <div className="c-k">Crie o seu acesso</div>
        <BemVindaAcesso emailInicial={email} />
        <p className="opt" style={{ marginTop: 12 }}>Use o mesmo e-mail da compra. É só definir a senha — nada de link no e-mail.</p>
      </section>

      <div className="lp-final">
        <p className="muted">Já tem senha? <a href="/entrar" style={{ color: "var(--wine)", borderBottom: "1px solid var(--gold)" }}>Entrar</a></p>
      </div>
    </main>
  );
}
