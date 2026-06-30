"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba, FiltrosBoard } from "./DiscoveriesBoard";

function construirHref(aba: Aba, filtros: FiltrosBoard, pagina: number): string {
  const params = new URLSearchParams();
  params.set("aba", aba);
  if (filtros.classificacao) params.set("classificacao", filtros.classificacao);
  if (filtros.busca) params.set("busca", filtros.busca);
  if (filtros.estado) params.set("estado", filtros.estado);
  else if (filtros.estadoBR) params.set("estado", "BR");
  if (filtros.precoMin !== undefined) params.set("precoMin", String(filtros.precoMin));
  if (filtros.precoMax !== undefined) params.set("precoMax", String(filtros.precoMax));
  if (filtros.ordem && filtros.ordem !== "recente") params.set("ordem", filtros.ordem);
  if (pagina > 1) params.set("pagina", String(pagina));
  return `/?${params.toString()}`;
}

/** Janela de páginas exibidas: sempre primeira/última + vizinhas da atual, com "…" no meio. */
function construirJanela(atual: number, total: number): Array<number | "..."> {
  const paginas: Array<number | "..."> = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - atual) <= 1) {
      paginas.push(p);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }
  return paginas;
}

export function Paginacao({
  aba,
  filtros,
  paginaAtual,
  totalPaginas,
}: {
  aba: Aba;
  filtros: FiltrosBoard;
  paginaAtual: number;
  totalPaginas: number;
}) {
  const { navegar } = useNavegacao();

  if (totalPaginas <= 1) return null;

  const janela = construirJanela(paginaAtual, totalPaginas);

  return (
    <nav className="paginacao" aria-label="Paginação">
      <button
        type="button"
        onClick={() => navegar(construirHref(aba, filtros, paginaAtual - 1))}
        disabled={paginaAtual === 1}
        className="paginacao-seta"
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>

      {janela.map((p, indice) =>
        p === "..." ? (
          <span key={`reticencias-${indice}`} className="paginacao-reticencias">
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => navegar(construirHref(aba, filtros, p))}
            className={`paginacao-item ${p === paginaAtual ? "paginacao-item-ativo" : ""}`}
            aria-current={p === paginaAtual ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => navegar(construirHref(aba, filtros, paginaAtual + 1))}
        disabled={paginaAtual === totalPaginas}
        className="paginacao-seta"
        aria-label="Próxima página"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </nav>
  );
}
