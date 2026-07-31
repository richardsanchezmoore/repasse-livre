import EntrarForm from "./EntrarForm";

export const metadata = { title: "Entrar · A Corte" };

export default function EntrarPage() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ O seu convite ◈</div>
      <h1 className="h-title">Entre na <em>Corte</em></h1>
      <p className="h-sub">Enviamos um selo mágico ao seu e-mail — um clique e você está dentro. Sem senha.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <EntrarForm />
      </section>
      <p className="muted">Seus dossiês ficam guardados só para você.</p>
    </main>
  );
}
