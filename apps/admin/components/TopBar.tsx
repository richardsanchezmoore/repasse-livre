"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListChecks, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { registrarEvento } from "@/lib/eventosAnalytics";
import { BarraSelecaoMultipla } from "./BarraSelecaoMultipla";
import { UserMenu } from "./UserMenu";
import { useNavegacao } from "./NavegacaoProvider";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import type { Aba } from "./DiscoveriesBoard";
import type { Usuario } from "@/lib/supabase-server";

export function TopBar({
  aba,
  busca,
  estado,
  estadosDisponiveis,
  usuario,
}: {
  aba: Aba;
  busca?: string;
  estado?: string;
  estadosDisponiveis: string[];
  usuario: Usuario | null;
}) {
  const { navegar } = useNavegacao();
  const { modoSelecao, alternarModoSelecao, limparSelecao } = useSelecaoMultipla();
  const searchParams = useSearchParams();
  const [termoBusca, setTermoBusca] = useState(busca ?? "");
  const [rotuloEstadoCompacto, setRotuloEstadoCompacto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTermoBusca(busca ?? "");
  }, [busca]);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 640px)");
    const atualizar = () => setRotuloEstadoCompacto(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);

  useEffect(() => {
    limparSelecao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  function atualizarParams(alteracoes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    // Mudar busca/estado invalida a paginação atual — volta pra página 1.
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

  function aoDigitarBusca(valor: string) {
    setTermoBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      atualizarParams({ busca: valor || undefined });
      // Só registra termos com algum conteúdo real — evita logar todo
      // backspace que volta o campo a vazio como uma "busca".
      if (valor.trim().length >= 2) {
        registrarEvento("busca", { termo: valor.trim(), estado, aba });
      }
    }, 400);
  }

  function aoClicarBuscar() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    atualizarParams({ busca: termoBusca || undefined });
  }

  function selecionarEstado(novoEstado: string) {
    atualizarParams({ estado: novoEstado || undefined });
    registrarEvento("busca", { termo: termoBusca || undefined, estado: novoEstado || undefined, aba });
  }

  const podeSelecionarVarios = usuario?.role === "admin" && aba !== "favoritos";
  // Anunciar exige conta — quem não está logado vai pro login e volta pra
  // /enviar automaticamente depois (ver app/auth/callback/route.ts).
  const hrefAnunciar = usuario ? "/enviar" : "/login?redirect=%2Fenviar";

  return (
    <div className="top-bar">
      <div className="top-bar-linha-principal">
        <Link href="/" className="logo-link" aria-label="Ir para a página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Repasse Livre" className="logo-img" />
        </Link>
        {modoSelecao ? (
          <BarraSelecaoMultipla aba={aba} />
        ) : (
          <div className={`busca-slim ${buscaAberta ? "busca-slim-aberta" : ""}`}>
            <input
              type="text"
              value={termoBusca}
              onChange={(evento) => aoDigitarBusca(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") aoClicarBuscar();
                if (evento.key === "Escape") setBuscaAberta(false);
              }}
              placeholder="Buscar veículo..."
              className="busca-slim-input"
              autoFocus={buscaAberta}
            />
            <select
              value={estado ?? ""}
              onChange={(evento) => selecionarEstado(evento.target.value)}
              className="busca-slim-uf"
              aria-label="Filtrar por estado"
            >
              <option value="">{rotuloEstadoCompacto ? "UF" : "Todos os estados"}</option>
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
            <button
              type="button"
              onClick={() => setBuscaAberta(false)}
              className="busca-slim-fechar"
              aria-label="Fechar busca"
              title="Fechar busca"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </div>
        )}
        <Link href={hrefAnunciar} className="botao-anunciar">
          <Plus size={16} strokeWidth={2.25} />
          Anunciar
        </Link>
      </div>

      <div className="top-bar-acoes">
        {podeSelecionarVarios && !modoSelecao && (
          <button
            type="button"
            className="botao-selecionar-varios"
            onClick={alternarModoSelecao}
            aria-label="Selecionar vários"
            title="Selecionar vários"
          >
            <ListChecks size={16} strokeWidth={1.75} />
            <span>Selecionar Vários</span>
          </button>
        )}
        {!modoSelecao && !buscaAberta && (
          <button
            type="button"
            className="busca-icone-botao"
            onClick={() => setBuscaAberta(true)}
            aria-label="Buscar"
            title="Buscar"
          >
            <Search size={18} strokeWidth={2.25} />
          </button>
        )}
        <Link href={hrefAnunciar} className="botao-anunciar-compacto" aria-label="Anunciar" title="Anunciar">
          <Plus size={18} strokeWidth={2.25} />
        </Link>
        <UserMenu usuario={usuario} />
      </div>
    </div>
  );
}
