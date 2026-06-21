"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";

interface NavegacaoContexto {
  navegar: (url: string) => void;
  pendente: boolean;
}

const NavegacaoContext = createContext<NavegacaoContexto | null>(null);

export function NavegacaoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  function navegar(url: string) {
    iniciarTransicao(() => router.push(url));
  }

  return <NavegacaoContext.Provider value={{ navegar, pendente }}>{children}</NavegacaoContext.Provider>;
}

export function useNavegacao(): NavegacaoContexto {
  const contexto = useContext(NavegacaoContext);
  if (!contexto) {
    throw new Error("useNavegacao precisa ser usado dentro de NavegacaoProvider");
  }
  return contexto;
}
