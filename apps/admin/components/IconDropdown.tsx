"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function IconDropdown({
  Icone,
  rotulo,
  ativo,
  mostrarRotulo,
  avatarUrl,
  children,
}: {
  Icone: LucideIcon;
  rotulo: string;
  ativo?: boolean;
  /** Mostra o `rotulo` como texto ao lado do ícone (em vez de só tooltip). */
  mostrarRotulo?: boolean;
  /** Se informado (e carregar), mostra a foto circular no lugar do ícone. */
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [fotoOk, setFotoOk] = useState(true);
  const fechamentoPendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function abrirAoEntrar() {
    if (fechamentoPendente.current) clearTimeout(fechamentoPendente.current);
    setAberto(true);
  }

  function fecharAoSair() {
    fechamentoPendente.current = setTimeout(() => setAberto(false), 200);
  }

  const mostrandoFoto = Boolean(avatarUrl) && fotoOk;

  return (
    <div
      ref={containerRef}
      className="icon-dropdown"
      onMouseEnter={abrirAoEntrar}
      onMouseLeave={fecharAoSair}
    >
      <button
        type="button"
        className={`icon-dropdown-botao ${ativo ? "icon-dropdown-botao-ativo" : ""} ${
          mostrarRotulo ? "icon-dropdown-botao-com-texto" : ""
        } ${mostrandoFoto ? "icon-dropdown-botao-avatar" : ""}`}
        onClick={() => setAberto(true)}
        aria-label={rotulo}
        title={rotulo}
      >
        {mostrandoFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl as string}
            alt=""
            className="icon-dropdown-avatar"
            referrerPolicy="no-referrer"
            onError={() => setFotoOk(false)}
          />
        ) : (
          <Icone size={18} strokeWidth={1.75} />
        )}
        {mostrarRotulo && <span className="icon-dropdown-botao-rotulo">{rotulo}</span>}
      </button>
      {aberto && <div className="icon-dropdown-box">{children}</div>}
    </div>
  );
}
