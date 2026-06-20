"use client";

import { useState, useTransition } from "react";
import { apagarTodasRejeitadas } from "@/app/actions";

export function BotaoApagarTudo() {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoClicar() {
    if (!window.confirm("Apagar TODAS as oportunidades rejeitadas definitivamente? A contagem fica preservada no histórico.")) {
      return;
    }
    iniciarTransicao(async () => {
      try {
        await apagarTodasRejeitadas();
        setErro(null);
      } catch {
        setErro("Falha ao apagar. Tente novamente.");
      }
    });
  }

  return (
    <div className="apagar-tudo">
      <button disabled={pendente} onClick={aoClicar} className="botao-apagar-tudo">
        {pendente ? "Apagando…" : "Apagar tudo"}
      </button>
      {erro && <span className="campo-erro">{erro}</span>}
    </div>
  );
}
