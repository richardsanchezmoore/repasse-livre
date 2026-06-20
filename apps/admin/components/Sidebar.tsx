import Link from "next/link";
import type { Aba } from "./DiscoveriesBoard";

const ITENS: Array<{ aba: Aba; rotulo: string; icone: string }> = [
  { aba: "descobertas", rotulo: "Descobertas", icone: "🔎" },
  { aba: "enviadas", rotulo: "Enviadas", icone: "📤" },
  { aba: "aprovadas", rotulo: "Aprovadas", icone: "✅" },
  { aba: "rejeitadas", rotulo: "Rejeitadas", icone: "❌" },
];

export function Sidebar({ abaAtiva, contagens }: { abaAtiva: Aba; contagens: Record<Aba, number> }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-titulo">Repasse Livre</div>
      <ul className="sidebar-lista">
        {ITENS.map((item) => (
          <li key={item.aba}>
            <Link
              href={`/?aba=${item.aba}`}
              className={`sidebar-item ${item.aba === abaAtiva ? "sidebar-item-ativo" : ""}`}
            >
              <span className="sidebar-icone" aria-hidden="true">
                {item.icone}
              </span>
              <span className="sidebar-rotulo">{item.rotulo}</span>
              <span className="sidebar-contador">{contagens[item.aba]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
