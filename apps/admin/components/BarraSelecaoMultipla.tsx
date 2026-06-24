"use client";

import { useState } from "react";
import { Check, CheckSquare, Trash2, X, XCircle } from "lucide-react";
import { aprovarOportunidades, apagarOportunidades, rejeitarOportunidades } from "@/app/actions";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import type { Aba } from "./DiscoveriesBoard";

export function BarraSelecaoMultipla({ aba }: { aba: Aba }) {
  const { selecionados, idsVisiveis, limparSelecao, processando, executarEmMassa, selecionarTodos } =
    useSelecaoMultipla();
  const [erro, setErro] = useState<string | null>(null);

  const ids = Array.from(selecionados);
  const semSelecao = ids.length === 0;
  const pendente = processando;
  const todosJaSelecionados = idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionados.has(id));

  function executar(acao: () => Promise<void>) {
    setErro(null);
    executarEmMassa(async () => {
      try {
        await acao();
        limparSelecao();
      } catch {
        setErro("Falha ao processar. Tente novamente.");
      }
    });
  }

  function aoAprovar() {
    executar(() => aprovarOportunidades(ids));
  }

  function aoRejeitar() {
    executar(() => rejeitarOportunidades(ids));
  }

  function aoApagar() {
    if (!window.confirm(`Apagar ${ids.length} oportunidade(s) selecionada(s) definitivamente? A contagem fica preservada no histórico.`)) {
      return;
    }
    executar(() => apagarOportunidades(ids));
  }

  return (
    <div className="barra-selecao-multipla">
      <span className="barra-selecao-contador">{ids.length} selecionado(s)</span>

      {erro && <span className="campo-erro">{erro}</span>}

      <div className="barra-selecao-acoes">
        <button
          type="button"
          className="acao-selecao acao-selecao-todos"
          disabled={idsVisiveis.length === 0 || todosJaSelecionados || pendente}
          onClick={selecionarTodos}
        >
          <CheckSquare size={16} strokeWidth={2} /> Selecionar todos ({idsVisiveis.length})
        </button>
        {aba !== "rejeitadas" && (
          <>
            <button type="button" className="acao-selecao acao-selecao-aprovar" disabled={semSelecao || pendente} onClick={aoAprovar}>
              <Check size={16} strokeWidth={2} /> Aprovar selecionados
            </button>
            <button type="button" className="acao-selecao acao-selecao-rejeitar" disabled={semSelecao || pendente} onClick={aoRejeitar}>
              <XCircle size={16} strokeWidth={2} /> Rejeitar selecionados
            </button>
          </>
        )}
        {aba === "rejeitadas" && (
          <button type="button" className="acao-selecao acao-selecao-apagar" disabled={semSelecao || pendente} onClick={aoApagar}>
            <Trash2 size={16} strokeWidth={2} /> Apagar selecionados
          </button>
        )}
        <button type="button" className="acao-selecao acao-selecao-cancelar" onClick={limparSelecao}>
          <X size={16} strokeWidth={2} /> Cancelar
        </button>
      </div>
    </div>
  );
}
