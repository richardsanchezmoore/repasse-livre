"use client";

import { useSearchParams } from "next/navigation";
import { CLASSIFICACOES, ROTULO_CLASSIFICACAO_FILTRO, type Classificacao } from "@/lib/classificacao";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba } from "./DiscoveriesBoard";

export function FiltroClassificacao({ aba, ativa }: { aba: Aba; ativa?: Classificacao }) {
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();

  function selecionar(classificacao?: Classificacao) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    if (classificacao) {
      params.set("classificacao", classificacao);
    } else {
      params.delete("classificacao");
    }
    navegar(`/?${params.toString()}`);
  }

  return (
    <div className="filtro-classificacao">
      <button
        type="button"
        onClick={() => selecionar(undefined)}
        className={`filtro-chip ${!ativa ? "filtro-chip-ativo" : ""}`}
      >
        Todas
      </button>
      {CLASSIFICACOES.map((classificacao) => (
        <button
          type="button"
          key={classificacao}
          onClick={() => selecionar(classificacao)}
          className={`filtro-chip ${ativa === classificacao ? "filtro-chip-ativo" : ""}`}
        >
          {ROTULO_CLASSIFICACAO_FILTRO[classificacao]}
        </button>
      ))}
    </div>
  );
}
