"use client";

import type { ReactNode } from "react";
import { useNavegacao } from "./NavegacaoProvider";
import { BoardSkeleton } from "./BoardSkeleton";

export function BoardArea({ children }: { children: ReactNode }) {
  const { pendente } = useNavegacao();

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
