"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTextos } from "@/lib/useIdioma";
import { CascaAuth, RodapeTrocaConta } from "@/components/CascaAuth";

export function PaginaCadastro({ redirect, children }: { redirect?: string; children: ReactNode }) {
  const tx = useTextos();
  const linkLogin = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  return (
    <CascaAuth
      titulo={tx("criarContaTitulo")}
      subtitulo={tx("criarContaSub")}
      legal={false}
      rodape={<RodapeTrocaConta pergunta={tx("jaTemConta")} href={linkLogin} acao={tx("entrarTitulo")} />}
    >
      {children}
      {/* ⚠️ O aviso legal fica AQUI e não na casca: só a criação de conta
          precisa dele, e repeti-lo no login seria ruído. */}
      <p className="login-legal">
        {tx("aoCriarConta")} <Link href="/termos">{tx("termosDeUso")}</Link> {tx("eA")}{" "}
        <Link href="/privacidade">{tx("privacidade")}</Link>.
      </p>
    </CascaAuth>
  );
}
