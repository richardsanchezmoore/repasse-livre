"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
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

export function TopBar({
  aba,
  busca,
  precoMin,
  precoMax,
  ordem,
}: {
  aba: Aba;
  busca?: string;
  precoMin?: number;
  precoMax?: number;
  ordem: Ordem;
}) {
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [termoBusca, setTermoBusca] = useState(busca ?? "");
  const [minDigitos, setMinDigitos] = useState(precoMin ? String(precoMin) : "");
  const [maxDigitos, setMaxDigitos] = useState(precoMax ? String(precoMax) : "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTermoBusca(busca ?? "");
  }, [busca]);

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

  function aoDigitarBusca(valor: string) {
    setTermoBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      atualizarParams({ busca: valor || undefined });
    }, 400);
  }

  function selecionarOrdem(novaOrdem: Ordem) {
    atualizarParams({ ordem: novaOrdem === "recente" ? undefined : novaOrdem });
  }

  function aplicarFaixaPreco() {
    atualizarParams({
      precoMin: minDigitos || undefined,
      precoMax: maxDigitos || undefined,
    });
  }

  function limparFaixaPreco() {
    setMinDigitos("");
    setMaxDigitos("");
    atualizarParams({ precoMin: undefined, precoMax: undefined });
  }

  const filtroPrecoAtivo = Boolean(precoMin || precoMax);

  return (
    <div className="top-bar">
      <div className="busca-slim">
        <Search size={16} strokeWidth={1.75} className="busca-slim-icone" />
        <input
          type="text"
          value={termoBusca}
          onChange={(evento) => aoDigitarBusca(evento.target.value)}
          placeholder="Buscar veículo..."
          className="busca-slim-input"
        />
      </div>

      <div className="top-bar-acoes">
        <Link href="/enviar" className="botao-anunciar">
          <Plus size={16} strokeWidth={2.25} />
          Anunciar
        </Link>
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
