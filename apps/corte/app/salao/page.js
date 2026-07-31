export const metadata = { title: "O Salão · A Corte" };

export default function SalaoPage() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ O Salão ◈</div>
      <h1 className="h-title">O <em>Salão</em></h1>
      <p className="h-sub">A roda de chá das damas da Corte — onde o discernimento vira conversa.</p>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="c-t">Em breve ✧</div>
        <div className="c-p">A comunidade abre as portas na próxima temporada. Por enquanto, cuide do seu Dossiê e da sua Jornada.</div>
      </section>
    </main>
  );
}
