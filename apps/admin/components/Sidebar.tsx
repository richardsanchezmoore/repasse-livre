"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  Globe,
  Heart,
  LogIn,
  Menu,
  Plus,
  Search,
  Send,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba } from "./DiscoveriesBoard";

// "Explorar" — filas do board. Favoritos saiu daqui: é área pessoal do usuário,
// não uma fila de moderação (agrupado com Conta/Buscas mais abaixo).
const ITENS: Array<{ aba: Aba; rotulo: string; Icone: LucideIcon; soAdmin?: boolean }> = [
  { aba: "descobertas", rotulo: "Descobertas", Icone: Search, soAdmin: true },
  { aba: "enviadas", rotulo: "Enviadas", Icone: Send, soAdmin: true },
  { aba: "aprovadas", rotulo: "Oportunidades", Icone: CheckCircle2 },
  { aba: "rejeitadas", rotulo: "Rejeitadas", Icone: XCircle, soAdmin: true },
];

export function Sidebar({
  abaAtiva,
  contagens,
  role,
  usuarioLogado = false,
}: {
  abaAtiva: Aba;
  contagens: Record<Aba, number>;
  role: "admin" | "publico" | null;
  usuarioLogado?: boolean;
}) {
  const itensVisiveis = ITENS.filter((item) => !item.soAdmin || role === "admin");
  // Acessos do usuário logado (Conta, BIA, Buscas) — antes só no menu flutuante.
  const mostrarConta = usuarioLogado || role === "admin";
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
          {mostrarConta && (
            <li>
              <button
                type="button"
                onClick={() => navegar("/bia")}
                className={`sidebar-item ${pathname === "/bia" ? "sidebar-item-ativo" : ""}`}
                title="Inteligência de Mercado"
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <BarChart3 size={18} strokeWidth={1.75} />
                </span>
              </button>
            </li>
          )}
        </ul>
        {/* Minha área — Favoritos + Buscas + Conta juntos (pessoal do usuário) */}
        <div className="sidebar-rodape">
          <button
            type="button"
            onClick={() => navegar("/?aba=favoritos")}
            className={`sidebar-item ${pathname === "/" && abaAtiva === "favoritos" ? "sidebar-item-ativo" : ""}`}
            title="Favoritos"
          >
            <span className="sidebar-icone" aria-hidden="true">
              <Heart size={18} strokeWidth={1.75} />
            </span>
          </button>
          {mostrarConta && (
            <>
              <span
                className="sidebar-item"
                style={{ opacity: 0.5, cursor: "default" }}
                title="Buscas e alertas · em breve"
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <Bell size={18} strokeWidth={1.75} />
                </span>
              </span>
              <button
                type="button"
                onClick={() => navegar("/conta")}
                className={`sidebar-item ${pathname === "/conta" ? "sidebar-item-ativo" : ""}`}
                title="Minha Conta"
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <UserCircle size={18} strokeWidth={1.75} />
                </span>
              </button>
            </>
          )}
        </div>
        {role === "admin" && (
          <div className="sidebar-rodape">
            <button
              type="button"
              onClick={() => navegar("/worker")}
              className={`sidebar-item ${pathname === "/worker" ? "sidebar-item-ativo" : ""}`}
              title="Motor de Descoberta"
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Activity size={18} strokeWidth={1.75} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => navegar("/seo")}
              className={`sidebar-item ${pathname === "/seo" ? "sidebar-item-ativo" : ""}`}
              title="SEO"
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Globe size={18} strokeWidth={1.75} />
              </span>
            </button>
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
            <button
              type="button"
              onClick={() => navegar("/configuracoes")}
              className={`sidebar-item ${pathname === "/configuracoes" ? "sidebar-item-ativo" : ""}`}
              title="Configurações"
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Settings size={18} strokeWidth={1.75} />
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
        <p className="sidebar-grupo-titulo">Explorar</p>
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
          {mostrarConta && (
            <li>
              <button
                type="button"
                onClick={() => navegarEFechar("/bia")}
                className={`sidebar-item ${pathname === "/bia" ? "sidebar-item-ativo" : ""}`}
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <BarChart3 size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">Inteligência de Mercado</span>
              </button>
            </li>
          )}
        </ul>
        {/* Minha área — Favoritos + Buscas + Conta juntos (pessoal do usuário) */}
        <div className="sidebar-rodape">
          <p className="sidebar-grupo-titulo">Minha área</p>
          <button
            type="button"
            onClick={() => navegarEFechar("/?aba=favoritos")}
            className={`sidebar-item ${pathname === "/" && abaAtiva === "favoritos" ? "sidebar-item-ativo" : ""}`}
          >
            <span className="sidebar-icone" aria-hidden="true">
              <Heart size={18} strokeWidth={1.75} />
            </span>
            <span className="sidebar-rotulo">Favoritos</span>
            <span className="sidebar-contador">{contagens.favoritos}</span>
          </button>
          {mostrarConta && (
            <>
              <div className="sidebar-item" style={{ opacity: 0.55, cursor: "default" }} aria-disabled="true">
                <span className="sidebar-icone" aria-hidden="true">
                  <Bell size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">Buscas · Alertas</span>
                <span className="sidebar-contador">Em breve</span>
              </div>
              <button
                type="button"
                onClick={() => navegarEFechar("/conta")}
                className={`sidebar-item ${pathname === "/conta" ? "sidebar-item-ativo" : ""}`}
              >
                <span className="sidebar-icone" aria-hidden="true">
                  <UserCircle size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">Minha Conta</span>
              </button>
            </>
          )}
        </div>
        {role === "admin" && (
          <div className="sidebar-rodape">
            <p className="sidebar-grupo-titulo">Administração</p>
            <button
              type="button"
              onClick={() => navegarEFechar("/worker")}
              className={`sidebar-item ${pathname === "/worker" ? "sidebar-item-ativo" : ""}`}
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Activity size={18} strokeWidth={1.75} />
              </span>
              <span className="sidebar-rotulo">Motor de Descoberta</span>
            </button>
            <button
              type="button"
              onClick={() => navegarEFechar("/seo")}
              className={`sidebar-item ${pathname === "/seo" ? "sidebar-item-ativo" : ""}`}
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Globe size={18} strokeWidth={1.75} />
              </span>
              <span className="sidebar-rotulo">SEO</span>
            </button>
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
            <button
              type="button"
              onClick={() => navegarEFechar("/configuracoes")}
              className={`sidebar-item ${pathname === "/configuracoes" ? "sidebar-item-ativo" : ""}`}
            >
              <span className="sidebar-icone" aria-hidden="true">
                <Settings size={18} strokeWidth={1.75} />
              </span>
              <span className="sidebar-rotulo">Configurações</span>
            </button>
          </div>
        )}

        <div className="sidebar-rodape">
          <Link href="/enviar" onClick={() => setAberto(false)} className="sidebar-item">
            <span className="sidebar-icone" aria-hidden="true">
              <Plus size={18} strokeWidth={1.75} />
            </span>
            <span className="sidebar-rotulo">Anunciar</span>
          </Link>
          {!usuarioLogado && (
            <>
              <Link href="/login" onClick={() => setAberto(false)} className="sidebar-item">
                <span className="sidebar-icone" aria-hidden="true">
                  <LogIn size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">Login</span>
              </Link>
              <Link href="/cadastro" onClick={() => setAberto(false)} className="sidebar-item">
                <span className="sidebar-icone" aria-hidden="true">
                  <UserPlus size={18} strokeWidth={1.75} />
                </span>
                <span className="sidebar-rotulo">Criar Conta</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
