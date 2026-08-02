import EntrarForm from "./EntrarForm";

export const metadata = { title: "Entrar · Damas Virtuosas" };

export default function EntrarPage() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ O seu convite ◈</div>
      <h1 className="h-title">Bem-vinda às <em>Damas Virtuosas</em></h1>
      <p className="h-sub">Crie sua conta em segundos — ou entre, se já é uma dama da casa.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <EntrarForm />
      </section>
      <p className="muted">Seus dossiês ficam guardados só para você.</p>
    </main>
  );
}
