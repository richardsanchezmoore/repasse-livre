"use client";

import { useState } from "react";
import { HistoricoPrecos } from "./HistoricoPrecos";
import { ReferenciaPreco } from "./ReferenciaPreco";
import type { PontoHistoricoFipe } from "@/lib/fipeHistorico";
import type { ReferenciaPreco as Referencia } from "@/lib/referenciaPreco";

/**
 * Agrupa os dois gráficos da página individual — "Histórico Preços FIPE" e
 * "Preços de referência". No desktop ficam lado a lado (50/50); no mobile viram
 * abas pra economizar altura. Se só um dos dois tem dados, ele ocupa a largura
 * toda (sem abas). Ver project_repasse_livre_referencia_preco_plataforma.
 */
export function PainelComparativo({
  historico,
  referencia,
  precoAnuncio,
  fipeValor,
  mesRef,
}: {
  historico: PontoHistoricoFipe[];
  referencia: Referencia | null;
  precoAnuncio: number;
  fipeValor: number | null;
  mesRef: string | null;
}) {
  const [aba, setAba] = useState<"historico" | "referencia">("historico");

  const temHistorico = historico.length >= 2;
  const temReferencia = referencia !== null;

  if (!temHistorico && !temReferencia) return null;

  const painelReferencia = referencia && (
    <ReferenciaPreco
      referencia={referencia}
      precoAnuncio={precoAnuncio}
      fipeValor={fipeValor}
      mesRef={mesRef}
    />
  );

  // Só um dos dois → largura total, sem abas.
  if (temHistorico && !temReferencia) return <HistoricoPrecos serie={historico} />;
  if (!temHistorico && temReferencia) return <>{painelReferencia}</>;

  return (
    <div className="painel-comparativo">
      <div className="painel-comparativo-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "historico"}
          className={`painel-comparativo-aba${aba === "historico" ? " painel-comparativo-aba-ativa" : ""}`}
          onClick={() => setAba("historico")}
        >
          Histórico FIPE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "referencia"}
          className={`painel-comparativo-aba${aba === "referencia" ? " painel-comparativo-aba-ativa" : ""}`}
          onClick={() => setAba("referencia")}
        >
          Preços Referência
        </button>
      </div>

      <div className="painel-comparativo-item" data-ativo={aba === "historico"}>
        <HistoricoPrecos serie={historico} />
      </div>
      <div className="painel-comparativo-item" data-ativo={aba === "referencia"}>
        {painelReferencia}
      </div>
    </div>
  );
}
