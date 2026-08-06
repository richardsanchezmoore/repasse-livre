/** Esqueleto mostrado NA HORA a cada navegação (enquanto o servidor prepara a tela).
 *  Tira a sensação de "página travando" — a troca fica instantânea, como app. */
export default function Loading() {
  return (
    <main className="screen" aria-busy="true" aria-label="Carregando">
      <div className="sk" style={{ height: 14, width: 120, marginBottom: 14 }} />
      <div className="sk" style={{ height: 38, width: "80%", marginBottom: 18 }} />
      <div className="sk" style={{ height: 120, marginBottom: 14 }} />
      <div className="sk" style={{ height: 92, marginBottom: 14 }} />
      <div className="sk" style={{ height: 92 }} />
    </main>
  );
}
