"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";

interface SelecaoMultiplaContexto {
  modoSelecao: boolean;
  selecionados: Set<string>;
  processando: boolean;
  alternarModoSelecao: () => void;
  alternarSelecionado: (id: string) => void;
  limparSelecao: () => void;
  executarEmMassa: (acao: () => Promise<void>) => void;
}

const SelecaoMultiplaContext = createContext<SelecaoMultiplaContexto | null>(null);

export function SelecaoMultiplaProvider({ children }: { children: ReactNode }) {
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, iniciarProcessamento] = useTransition();

  const alternarModoSelecao = useCallback(() => {
    setModoSelecao((atual) => !atual);
    setSelecionados(new Set());
  }, []);

  const alternarSelecionado = useCallback((id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }, []);

  const limparSelecao = useCallback(() => {
    setModoSelecao(false);
    setSelecionados(new Set());
  }, []);

  const executarEmMassa = useCallback((acao: () => Promise<void>) => {
    iniciarProcessamento(async () => {
      await acao();
    });
  }, []);

  return (
    <SelecaoMultiplaContext.Provider
      value={{
        modoSelecao,
        selecionados,
        processando,
        alternarModoSelecao,
        alternarSelecionado,
        limparSelecao,
        executarEmMassa,
      }}
    >
      {children}
    </SelecaoMultiplaContext.Provider>
  );
}

export function useSelecaoMultipla(): SelecaoMultiplaContexto {
  const contexto = useContext(SelecaoMultiplaContext);
  if (!contexto) {
    throw new Error("useSelecaoMultipla precisa ser usado dentro de SelecaoMultiplaProvider");
  }
  return contexto;
}
