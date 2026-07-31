const NOITES = [
  { n: "I", t: "O Meu Próprio Coração", d: "Antes de julgá-lo, olhe para dentro", on: true },
  { n: "II", t: "Os Frutos, Não as Palavras", d: "Discernindo o Sedutor e o Dissimulado" },
  { n: "III", t: "Liberdade ou Gaiola?", d: "Discernindo o Dominador e o Crítico" },
  { n: "IV", t: "Palavras Firmes, Passos Firmes", d: "Discernindo o Indeciso e o Omisso" },
  { n: "V", t: "O Retrato de Boaz", d: "Mirando o homem certo" },
  { n: "VI", t: "O Meu Valor", d: "Uma dama que se conhece não implora migalhas" },
  { n: "VII", t: "Esperar Sem Medo", d: "Confiando o jardim ao Jardineiro" },
];

export default function Jornada() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ A Escola da Corte ◈</div>
      <h1 className="h-title">A sua <em>jornada</em></h1>
      <p className="h-sub">Sete noites de discernimento. Uma por vez — no seu ritmo.</p>

      <div className="shelf" style={{ marginTop: 18 }}>
        {NOITES.map((no) => (
          <div key={no.n} className="row" style={no.on ? { borderColor: "var(--gold)" } : undefined}>
            <span className="ri" style={{ fontFamily: "var(--disp)", fontStyle: "italic", fontWeight: 900 }}>{no.n}</span>
            <div>
              <div className="rt">{no.t}</div>
              <div className="rd">{no.d}</div>
            </div>
            <span className="rgo">{no.on ? "▶" : "🔒"}</span>
          </div>
        ))}
      </div>

      <hr className="divider" />
      <p className="muted">Novos conteúdos toda semana para a assinante da Corte.</p>
    </main>
  );
}
