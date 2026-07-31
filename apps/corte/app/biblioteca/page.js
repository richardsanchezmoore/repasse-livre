import Link from "next/link";

const OBRAS = [
  { ic: "📖", t: "O Panfleto Secreto do Altar", d: "Os 12 perfis a evitar — o diário completo", href: "/biblioteca/panfleto" },
  { ic: "🎁", t: "O Cavalheiro que Vale o seu Altar", d: "Bônus · o contramodelo (Boaz + Efésios 5)", href: "/biblioteca/boaz" },
  { ic: "🃏", t: "Cartas Entre Nós", d: "Bônus · 24 perguntas que revelam o caráter", href: "/biblioteca/cartas" },
  { ic: "🚦", t: "Guia \"Verde ou Vermelho?\"", d: "Bônus · red flags × sinais do homem de Deus", href: "/biblioteca/guia" },
  { ic: "📱", t: "Wallpapers \"Mulher de Valor\"", d: "Bônus · versículos de identidade", href: "/biblioteca/wallpapers" },
];

export default function Biblioteca() {
  return (
    <main className="screen">
      <div className="eyebrow">◈ A Biblioteca ◈</div>
      <h1 className="h-title">O seu <em>acervo</em></h1>
      <p className="h-sub">O diário e os cinco tesouros da temporada, sempre à mão.</p>

      <div className="shelf" style={{ marginTop: 18 }}>
        {OBRAS.map((o) => (
          <Link key={o.href} href={o.href} className="row">
            <span className="ri">{o.ic}</span>
            <div>
              <div className="rt">{o.t}</div>
              <div className="rd">{o.d}</div>
            </div>
            <span className="rgo">→</span>
          </Link>
        ))}
      </div>

      <hr className="divider" />
      <p className="muted">Leitura leve e devocional — feita para o seu celular.</p>
    </main>
  );
}
