"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";

interface SelecaoMultiplaContexto {
  modoSelecao: boolean;
  selecionados: Set<string>;
  idsVisiveis: string[];
  processando: boolean;
  alternarModoSelecao: () => void;
  alternarSelecionado: (id: string) => void;
  limparSelecao: () => void;
  executarEmMassa: (acao: () => Promise<void>) => void;
  registrarIdsVisiveis: (ids: string[]) => void;
  selecionarTodos: () => void;
}

const SelecaoMultiplaContext = createContext<SelecaoMultiplaContexto | null>(null);

export function SelecaoMultiplaProvider({ children }: { children: ReactNode }) {
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [idsVisiveis, setIdsVisiveis] = useState<string[]>([]);
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

  // Registrado pelo Board (server component) com os ids da página/filtro
  // atual, pra "Selecionar todos" não depender de clicar item por item.
  const registrarIdsVisiveis = useCallback((ids: string[]) => {
    setIdsVisiveis(ids);
  }, []);

  const selecionarTodos = useCallback(() => {
    setSelecionados(new Set(idsVisiveis));
  }, [idsVisiveis]);

  return (
    <SelecaoMultiplaContext.Provider
      value={{
        modoSelecao,
        selecionados,
        idsVisiveis,
        processando,
        alternarModoSelecao,
        alternarSelecionado,
        limparSelecao,
        executarEmMassa,
        registrarIdsVisiveis,
        selecionarTodos,
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
