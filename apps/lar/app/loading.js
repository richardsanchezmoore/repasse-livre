/** Esqueleto mostrado NA HORA a cada navegação (enquanto o servidor prepara a tela).
 *  Some a sensação de "página travando" — a troca fica instantânea, como app. */
export default function Loading() {
  return (
    <main className="screen" aria-busy="true" aria-label="Carregando">
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="sk" style={{ flex: 1, height: 46 }} />
      </div>
      <div className="sk" style={{ height: 58 }} />
      <div className="sk" style={{ height: 128 }} />
      <div className="sk" style={{ height: 96 }} />
    </main>
  );
}
