"use client";

import type { ReactNode } from "react";
import { useNavegacao } from "./NavegacaoProvider";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import { BoardSkeleton } from "./BoardSkeleton";

export function BoardArea({ children }: { children: ReactNode }) {
  const { pendente: navegacaoPendente } = useNavegacao();
  const { processando } = useSelecaoMultipla();
  const pendente = navegacaoPendente || processando;

  return (
    <div className="board-area">
      {pendente && (
        <div className="board-area-skeleton" aria-hidden="true">
          <BoardSkeleton />
        </div>
      )}
      <div className={pendente ? "board-area-conteudo-pendente" : undefined}>{children}</div>
    </div>
  );
}
