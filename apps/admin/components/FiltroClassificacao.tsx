"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from "lucide-react";
import { CLASSIFICACOES, ROTULO_CLASSIFICACAO_FILTRO, type Classificacao } from "@/lib/classificacao";
import { apenasDigitos, formatarMoeda } from "@/lib/mascaras";
import { IconDropdown } from "./IconDropdown";
import { useNavegacao } from "./NavegacaoProvider";
import type { Aba, Ordem } from "./DiscoveriesBoard";

const ROTULO_ORDEM: Record<Ordem, string> = {
  recente: "Mais recente",
  margem: "Maior Margem",
  menor_valor: "Menor valor",
  maior_valor: "Maior Valor",
};

const ORDENS: Ordem[] = ["recente", "margem", "menor_valor", "maior_valor"];

export function FiltroClassificacao({
  aba,
  ativa,
  ordem = "recente",
  precoMin,
  precoMax,
}: {
  aba: Aba;
  ativa?: Classificacao;
  ordem?: Ordem;
  precoMin?: number;
  precoMax?: number;
}) {
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [minDigitos, setMinDigitos] = useState(precoMin ? String(precoMin) : "");
  const [maxDigitos, setMaxDigitos] = useState(precoMax ? String(precoMax) : "");
  const [chipsAbertos, setChipsAbertos] = useState(false);

  function atualizarParams(alteracoes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (valor) {
        params.set(chave, valor);
      } else {
        params.delete(chave);
      }
    }
    navegar(`/?${params.toString()}`);
  }

  function selecionar(classificacao?: Classificacao) {
    atualizarParams({ classificacao });
  }

  function selecionarOrdem(novaOrdem: Ordem) {
    atualizarParams({ ordem: novaOrdem === "recente" ? undefined : novaOrdem });
  }

  function aplicarFaixaPreco() {
    atualizarParams({ precoMin: minDigitos || undefined, precoMax: maxDigitos || undefined });
  }

  function limparFaixaPreco() {
    setMinDigitos("");
    setMaxDigitos("");
    atualizarParams({ precoMin: undefined, precoMax: undefined });
  }

  const filtroPrecoAtivo = Boolean(precoMin || precoMax);

  return (
    <div className="filtro-classificacao">
      <button
        type="button"
        className="filtro-toggle-mobile"
        onClick={() => setChipsAbertos((aberto) => !aberto)}
        aria-expanded={chipsAbertos}
      >
        <span>{ativa ? ROTULO_CLASSIFICACAO_FILTRO[ativa] : "Filtrar por Margem FIPE"}</span>
        <ChevronDown size={16} strokeWidth={2.25} className={chipsAbertos ? "filtro-toggle-seta-aberta" : ""} />
      </button>

      <div className={`filtro-chips ${chipsAbertos ? "filtro-chips-aberto" : ""}`}>
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

      <div className="filtro-ordenacao">
        <span className="filtro-ordenacao-label">Ordenar por:</span>
        <IconDropdown Icone={ArrowUpDown} rotulo="Ordenar" ativo={ordem !== "recente"}>
          <p className="icon-dropdown-titulo">Ordenar por</p>
          {ORDENS.map((opcao) => (
            <button
              key={opcao}
              type="button"
              className={`icon-dropdown-opcao ${opcao === ordem ? "icon-dropdown-opcao-ativa" : ""}`}
              onClick={() => selecionarOrdem(opcao)}
            >
              {ROTULO_ORDEM[opcao]}
            </button>
          ))}
        </IconDropdown>

        <IconDropdown Icone={SlidersHorizontal} rotulo="Filtrar" ativo={filtroPrecoAtivo}>
          <p className="icon-dropdown-titulo">Faixa de Preço</p>
          <div className="icon-dropdown-campo">
            <label htmlFor="preco-min">Mínimo</label>
            <input
              id="preco-min"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0"
              value={formatarMoeda(minDigitos)}
              onChange={(evento) => setMinDigitos(apenasDigitos(evento.target.value))}
            />
          </div>
          <div className="icon-dropdown-campo">
            <label htmlFor="preco-max">Máximo</label>
            <input
              id="preco-max"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0"
              value={formatarMoeda(maxDigitos)}
              onChange={(evento) => setMaxDigitos(apenasDigitos(evento.target.value))}
            />
          </div>
          <div className="icon-dropdown-rodape">
            <button type="button" className="icon-dropdown-limpar" onClick={limparFaixaPreco}>
              Limpar
            </button>
            <button type="button" className="icon-dropdown-aplicar" onClick={aplicarFaixaPreco}>
              Aplicar
            </button>
          </div>
        </IconDropdown>
      </div>
    </div>
  );
}
