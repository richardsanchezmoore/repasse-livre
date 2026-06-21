export function BoardSkeleton() {
  return (
    <section className="board">
      <header className="board-header">
        <span className="skeleton-bloco" style={{ width: 120, height: 16 }} />
      </header>
      <div className="board-lista">
        {Array.from({ length: 6 }).map((_, indice) => (
          <div key={indice} className="skeleton-card">
            <div className="skeleton-bloco skeleton-foto" />
            <div className="skeleton-bloco skeleton-margem" />
            <div className="skeleton-card-corpo">
              <div className="skeleton-bloco skeleton-linha" />
              <div className="skeleton-bloco skeleton-linha-curta" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
