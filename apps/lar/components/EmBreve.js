export default function EmBreve({ ic, titulo, texto }) {
  return (
    <main className="screen">
      <div className="marta-hi" style={{ marginTop: 8 }}>
        <div className="av">M</div>
        <div className="msg">
          <b>{ic} {titulo}</b> está a caminho. {texto} Enquanto isso, deixa eu te ajudar na <b>Cozinha</b> — é onde eu já estou pronta. 💛
        </div>
      </div>
      <a href="/cozinha" className="btn" style={{ marginTop: 16 }}>🍳 Ir para a Cozinha</a>
    </main>
  );
}
