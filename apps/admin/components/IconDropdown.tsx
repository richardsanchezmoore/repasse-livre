"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function IconDropdown({
  Icone,
  rotulo,
  ativo,
  children,
}: {
  Icone: LucideIcon;
  rotulo: string;
  ativo?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
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

  return (
    <div
      ref={containerRef}
      className="icon-dropdown"
      onMouseEnter={abrirAoEntrar}
      onMouseLeave={fecharAoSair}
    >
      <button
        type="button"
        className={`icon-dropdown-botao ${ativo ? "icon-dropdown-botao-ativo" : ""}`}
        onClick={() => setAberto(true)}
        aria-label={rotulo}
        title={rotulo}
      >
        <Icone size={18} strokeWidth={1.75} />
      </button>
      {aberto && <div className="icon-dropdown-box">{children}</div>}
    </div>
  );
}
