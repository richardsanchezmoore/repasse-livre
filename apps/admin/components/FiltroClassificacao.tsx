"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpDown, Building2, ChevronDown, SlidersHorizontal } from "lucide-react";
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
  proximidade: "Perto de mim",
};

const ORDENS_BASE: Ordem[] = ["recente", "margem", "menor_valor", "maior_valor"];

export function FiltroClassificacao({
  aba,
  ativa,
  ordem = "recente",
  precoMin,
  precoMax,
  anunciante,
  proximidadeDisponivel = false,
}: {
  aba: Aba;
  ativa?: Classificacao;
  ordem?: Ordem;
  precoMin?: number;
  precoMax?: number;
  anunciante?: "profissional" | "particular";
  proximidadeDisponivel?: boolean;
}) {
  // "Perto de mim" só aparece quando temos coordenada do usuário (ver
  // lib/geolocalizacao.ts) — sem isso a opção não faria sentido na lista.
  const ORDENS: Ordem[] = proximidadeDisponivel ? ["proximidade", ...ORDENS_BASE] : ORDENS_BASE;
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [minDigitos, setMinDigitos] = useState(precoMin ? String(precoMin) : "");
  const [maxDigitos, setMaxDigitos] = useState(precoMax ? String(precoMax) : "");
  const [chipsAbertos, setChipsAbertos] = useState(false);

  function atualizarParams(alteracoes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    // Mudar classificação/ordem/faixa de preço invalida a paginação atual.
    params.delete("pagina");
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

  function selecionarAnunciante(novoAnunciante?: "profissional" | "particular") {
    atualizarParams({ anunciante: novoAnunciante });
  }

  function selecionarOrdem(novaOrdem: Ordem) {
    // Sempre grava o valor explícito (mesmo "recente") — quando há
    // coordenada do usuário, a ausência do param vira "proximidade" por
    // padrão (ver page.tsx), então só assim dá pra escolher "recente" de
    // propósito e isso sobreviver a um refresh.
    atualizarParams({ ordem: novaOrdem });
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

        <IconDropdown Icone={Building2} rotulo="Anunciante" ativo={Boolean(anunciante)}>
          <p className="icon-dropdown-titulo">Tipo de anunciante</p>
          <button
            type="button"
            className={`icon-dropdown-opcao ${!anunciante ? "icon-dropdown-opcao-ativa" : ""}`}
            onClick={() => selecionarAnunciante(undefined)}
          >
            Todos
          </button>
          <button
            type="button"
            className={`icon-dropdown-opcao ${anunciante === "particular" ? "icon-dropdown-opcao-ativa" : ""}`}
            onClick={() => selecionarAnunciante("particular")}
          >
            Particular
          </button>
          <button
            type="button"
            className={`icon-dropdown-opcao ${anunciante === "profissional" ? "icon-dropdown-opcao-ativa" : ""}`}
            onClick={() => selecionarAnunciante("profissional")}
          >
            Profissional
          </button>
        </IconDropdown>
      </div>
    </div>
  );
}
