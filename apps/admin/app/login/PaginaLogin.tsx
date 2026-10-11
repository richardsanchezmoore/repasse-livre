"use client";

import type { ReactNode } from "react";
import { useTextos } from "@/lib/useIdioma";
import { CascaAuth, RodapeTrocaConta } from "@/components/CascaAuth";

export function PaginaLogin({ redirect, children }: { redirect?: string; children: ReactNode }) {
  const tx = useTextos();
  const linkCadastro = redirect ? `/cadastro?redirect=${encodeURIComponent(redirect)}` : "/cadastro";
  return (
    <CascaAuth
      titulo={tx("entrarTitulo")}
      subtitulo={tx("entrarSub")}
      rodape={<RodapeTrocaConta pergunta={tx("naoTemConta")} href={linkCadastro} acao={tx("criarContaTitulo")} />}
    >
      {children}
    </CascaAuth>
  );
}
