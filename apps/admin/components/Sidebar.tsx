"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Heart, Menu, Search, Send, Users, X, XCircle, type LucideIcon } from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba } from "./DiscoveriesBoard";

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
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  function navegarEFechar(url: string) {
    navegar(url);
    setAberto(false);
  }

  return (
    <>
      {/* Carril fino, sempre visível — não desloca o conteúdo ao abrir o overlay */}
      <nav className="sidebar">
        <div className="sidebar-topo">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="sidebar-hamburguer"
            aria-label="Abrir menu"
            title="Abrir menu"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        </div>
        <ul className="sidebar-lista">
          {itensVisiveis.map((item) => (
            <li key={item.aba}>
              <button
                type="button"
                onClick={() => navegar(`/?aba=${item.aba}`)}
                className={`sidebar-item ${pathname === "/" && item.aba === abaAtiva ? "sidebar-item-ativo" : ""}`}
                title={item.rotulo}
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <item.Icone size={18} strokeWidth={1.75} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {role === "admin" && (
          <div className="sidebar-rodape">
            <button
              type="button"
              onClick={() => navegar("/usuarios")}
              className={`sidebar-item ${pathname === "/usuarios" ? "sidebar-item-ativo" : ""}`}
              title="Usuários"
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Users size={18} strokeWidth={1.75} />
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Overlay — sobrepõe o conteúdo sem alterar o layout, no espírito do menu do r7.com */}
      <div
        className={`sidebar-overlay-backdrop ${aberto ? "sidebar-overlay-aberto" : ""}`}
        onClick={() => setAberto(false)}
        aria-hidden="true"
      />
      <nav className={`sidebar-overlay-painel ${aberto ? "sidebar-overlay-aberto" : ""}`}>
        <div className="sidebar-overlay-topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Repasse Livre" className="logo-img" />
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="sidebar-hamburguer"
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <ul className="sidebar-lista">
          {itensVisiveis.map((item) => (
            <li key={item.aba}>
              <button
                type="button"
                onClick={() => navegarEFechar(`/?aba=${item.aba}`)}
                className={`sidebar-item ${pathname === "/" && item.aba === abaAtiva ? "sidebar-item-ativo" : ""}`}
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <item.Icone size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">{item.rotulo}</span>
                <span className="sidebar-contador">{contagens[item.aba]}</span>
              </button>
            </li>
          ))}
        </ul>
        {role === "admin" && (
          <div className="sidebar-rodape">
            <button
              type="button"
              onClick={() => navegarEFechar("/usuarios")}
              className={`sidebar-item ${pathname === "/usuarios" ? "sidebar-item-ativo" : ""}`}
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Users size={18} strokeWidth={1.75} />
              </span>
              <span className="sidebar-rotulo">Usuários</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
