"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { MarcaContagem } from "@/lib/marcas";

/**
 * Modal "Ver todas as marcas": busca + lista de todas as marcas (com contagem),
 * aberto a partir da seção Marca do painel de filtros. Reaproveita o estilo do
 * painel de filtros (drawer portalizado + backdrop). Ver FiltroClassificacao.tsx.
 */
export function ModalMarcas({
  marcas,
  selecionada,
  onSelecionar,
  onFechar,
}: {
  marcas: MarcaContagem[];
  selecionada?: string;
  onSelecionar: (marca: string | undefined) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const termo = busca.trim().toLowerCase();
  const filtradas = termo ? marcas.filter((m) => m.marca.toLowerCase().includes(termo)) : marcas;

  return createPortal(
    <>
      <div className="painel-filtros-backdrop painel-filtros-aberto modal-marcas-backdrop" onClick={onFechar} aria-hidden />
      <aside className="painel-filtros painel-filtros-aberto modal-marcas-drawer" aria-label="Todas as marcas">
        <header className="painel-filtros-topo">
          <h2 className="painel-filtros-titulo">Todas as marcas</h2>
          <button type="button" className="painel-filtros-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={20} strokeWidth={2} />
          </button>
        </header>
        <div className="painel-filtros-corpo">
          <div className="modal-marcas-busca">
            <Search size={16} strokeWidth={2} aria-hidden />
            <input
              type="text"
              placeholder="Digite a marca desejada"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              autoFocus
            />
          </div>
          <ul className="modal-marcas-lista">
            <li>
              <button
                type="button"
                className={`modal-marcas-item ${!selecionada ? "modal-marcas-item-ativo" : ""}`}
                onClick={() => onSelecionar(undefined)}
              >
                <span>Todas as marcas</span>
              </button>
            </li>
            {filtradas.map((m) => (
              <li key={m.marca}>
                <button
                  type="button"
                  className={`modal-marcas-item ${selecionada === m.marca ? "modal-marcas-item-ativo" : ""}`}
                  onClick={() => onSelecionar(m.marca)}
                >
                  <span>{m.marca}</span>
                  <span className="modal-marcas-contagem">{m.count}</span>
                </button>
              </li>
            ))}
            {filtradas.length === 0 && <li className="modal-marcas-vazio">Nenhuma marca encontrada.</li>}
          </ul>
        </div>
      </aside>
    </>,
    document.body
  );
}
