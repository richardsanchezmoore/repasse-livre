import RedefinirForm from "./RedefinirForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redefinir senha · Damas Virtuosas" };

export default function RedefinirPage() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ Nova senha ◈</div>
      <h1 className="h-title">Crie uma <em>nova senha</em></h1>
      <p className="h-sub">Você chegou aqui pelo link do e-mail. Defina a senha e pronto.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <RedefinirForm />
      </section>
    </main>
  );
}
