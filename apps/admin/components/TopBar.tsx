"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { apenasDigitos, formatarMoeda } from "@/lib/mascaras";
import { BarraSelecaoMultipla } from "./BarraSelecaoMultipla";
import { IconDropdown } from "./IconDropdown";
import { UserMenu } from "./UserMenu";
import { useNavegacao } from "./NavegacaoProvider";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import type { Aba, Ordem } from "./DiscoveriesBoard";
import type { Usuario } from "@/lib/supabase-server";

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
  estado,
  estadosDisponiveis,
  precoMin,
  precoMax,
  ordem,
  usuario,
}: {
  aba: Aba;
  busca?: string;
  estado?: string;
  estadosDisponiveis: string[];
  precoMin?: number;
  precoMax?: number;
  ordem: Ordem;
  usuario: Usuario | null;
}) {
  const { navegar } = useNavegacao();
  const { modoSelecao, alternarModoSelecao, limparSelecao } = useSelecaoMultipla();
  const searchParams = useSearchParams();
  const [termoBusca, setTermoBusca] = useState(busca ?? "");
  const [minDigitos, setMinDigitos] = useState(precoMin ? String(precoMin) : "");
  const [maxDigitos, setMaxDigitos] = useState(precoMax ? String(precoMax) : "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTermoBusca(busca ?? "");
  }, [busca]);

  useEffect(() => {
    limparSelecao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

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

  function aoClicarBuscar() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    atualizarParams({ busca: termoBusca || undefined });
  }

  function selecionarOrdem(novaOrdem: Ordem) {
    atualizarParams({ ordem: novaOrdem === "recente" ? undefined : novaOrdem });
  }

  function selecionarEstado(novoEstado: string) {
    atualizarParams({ estado: novoEstado || undefined });
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
  const podeSelecionarVarios = usuario?.role === "admin" && aba !== "favoritos";

  return (
    <div className="top-bar">
      {modoSelecao ? (
        <BarraSelecaoMultipla aba={aba} />
      ) : (
        <div className="busca-slim">
          <input
            type="text"
            value={termoBusca}
            onChange={(evento) => aoDigitarBusca(evento.target.value)}
            onKeyDown={(evento) => evento.key === "Enter" && aoClicarBuscar()}
            placeholder="Buscar veículo..."
            className="busca-slim-input"
          />
          <select
            value={estado ?? ""}
            onChange={(evento) => selecionarEstado(evento.target.value)}
            className="busca-slim-uf"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos os estados</option>
            {estadosDisponiveis.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={aoClicarBuscar}
            className="busca-slim-botao"
            aria-label="Buscar"
            title="Buscar"
          >
            <Search size={18} strokeWidth={2.25} />
          </button>
        </div>
      )}

      <div className="top-bar-acoes">
        {podeSelecionarVarios && !modoSelecao && (
          <button type="button" className="botao-selecionar-varios" onClick={alternarModoSelecao}>
            <ListChecks size={16} strokeWidth={1.75} />
            Selecionar Vários
          </button>
        )}
        <Link href="/enviar" className="botao-anunciar">
          <Plus size={16} strokeWidth={2.25} />
          Anunciar
        </Link>
        {!modoSelecao && (
          <>
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
          </>
        )}

        <UserMenu usuario={usuario} />
      </div>
    </div>
  );
}
