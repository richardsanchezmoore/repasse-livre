export default function Perfil() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ A Dama ◈</div>
      <h1 className="h-title">O seu <em>perfil</em></h1>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="c-k">Seu acesso</div>
        <div className="c-t">Kit da Temporada <em>· vitalício</em></div>
        <div className="c-p">Você tem acesso ao Panfleto e aos 5 bônus, para sempre.</div>
      </section>

      <section className="card dark" style={{ marginTop: 14 }}>
        <div className="c-k">A Corte · assinatura</div>
        <div className="c-t">Journada semanal + comunidade</div>
        <div className="c-p">Devocional novo toda semana, o Salão das damas e as ferramentas de discernimento.</div>
        <span className="pill">Começar 7 dias grátis</span>
      </section>

      <hr className="divider" />
      <p className="muted">Em breve: gerenciar assinatura e notificações.</p>
    </main>
  );
}
