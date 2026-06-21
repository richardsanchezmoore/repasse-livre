"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Heart, Menu, Search, Send, XCircle, type LucideIcon } from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba } from "./DiscoveriesBoard";

const CHAVE_COLAPSADA = "repasse-livre:sidebar-colapsada";

const ITENS: Array<{ aba: Aba; rotulo: string; Icone: LucideIcon; soAdmin?: boolean }> = [
  { aba: "descobertas", rotulo: "Descobertas", Icone: Search, soAdmin: true },
  { aba: "enviadas", rotulo: "Enviadas", Icone: Send, soAdmin: true },
  { aba: "aprovadas", rotulo: "Oportunidades", Icone: CheckCircle2 },
  { aba: "rejeitadas", rotulo: "Rejeitadas", Icone: XCircle, soAdmin: true },
  { aba: "favoritos", rotulo: "Favoritos", Icone: Heart },
];

export function Sidebar({
  abaAtiva,
  contagens,
  role,
}: {
  abaAtiva: Aba;
  contagens: Record<Aba, number>;
  role: "admin" | "publico" | null;
}) {
  const itensVisiveis = ITENS.filter((item) => !item.soAdmin || role === "admin");
  const { navegar } = useNavegacao();
  const [colapsada, setColapsada] = useState(false);
  const [expandidaPorHover, setExpandidaPorHover] = useState(false);

  useEffect(() => {
    const salva = window.localStorage.getItem(CHAVE_COLAPSADA);
    if (salva === "1") setColapsada(true);
  }, []);

  function alternar() {
    setColapsada((atual) => {
      const novo = !atual;
      window.localStorage.setItem(CHAVE_COLAPSADA, novo ? "1" : "0");
      return novo;
    });
  }

  const colapsadaVisualmente = colapsada && !expandidaPorHover;

  return (
    <nav
      className={`sidebar ${colapsadaVisualmente ? "sidebar-colapsada" : ""}`}
      onMouseEnter={() => colapsada && setExpandidaPorHover(true)}
      onMouseLeave={() => setExpandidaPorHover(false)}
    >
      <div className="sidebar-topo">
        <button
          type="button"
          onClick={alternar}
          className="sidebar-hamburguer"
          aria-label={colapsada ? "Expandir menu" : "Recolher menu"}
          title={colapsada ? "Expandir menu" : "Recolher menu"}
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        {!colapsadaVisualmente && <span className="sidebar-titulo">Repasse Livre</span>}
      </div>
      <ul className="sidebar-lista">
        {itensVisiveis.map((item) => (
          <li key={item.aba}>
            <button
              type="button"
              onClick={() => navegar(`/?aba=${item.aba}`)}
              className={`sidebar-item ${item.aba === abaAtiva ? "sidebar-item-ativo" : ""}`}
              title={colapsadaVisualmente ? item.rotulo : undefined}
            >
              <span className="sidebar-icone" aria-hidden="true">
                <item.Icone size={18} strokeWidth={1.75} />
              </span>
              {!colapsadaVisualmente && (
                <>
                  <span className="sidebar-rotulo">{item.rotulo}</span>
                  <span className="sidebar-contador">{contagens[item.aba]}</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
