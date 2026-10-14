"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListChecks, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { registrarEvento } from "@/lib/eventosAnalytics";
import { salvarEstadoPreferido } from "@/lib/estadoPreferido";
import { BarraSelecaoMultipla } from "./BarraSelecaoMultipla";
import { SeletorMoeda } from "./SeletorMoeda";
import { SeletorIdioma } from "./SeletorIdioma";
import { UserMenu } from "./UserMenu";
import { useNavegacao } from "./NavegacaoProvider";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import type { Aba } from "./DiscoveriesBoard";
import type { Usuario } from "@/lib/supabase-server";
import { useTextos } from "@/lib/useIdioma";

export function TopBar({
  aba,
  busca,
  estado,
  cidade,
  estadosDisponiveis,
  cidadesDisponiveis = [],
  usuario,
}: {
  aba: Aba;
  busca?: string;
  estado?: string;
  cidade?: string;
  estadosDisponiveis: string[];
  cidadesDisponiveis?: string[];
  usuario: Usuario | null;
}) {
  const tx = useTextos();
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

  /**
   * ★★ O SELETOR DO TOPBAR FILTRA POR CIDADE, não por departamento.
   *
   * ⚠️ Antes ele listava `estadosDisponiveis`, que no Paraguai são os códigos
   * "PY-ASU", "PY-APA", "PY-CAN". Ninguém procura carro por sigla de
   * departamento — era um filtro de região que não filtrava região nenhuma na
   * cabeça de quem usa. No Paraguai a praça É a cidade.
   *
   * ⚠️ Não mexe em `estado`: o breadcrumb abaixo dos KPI segue sendo o
   * seletor de departamento, para quem quiser o recorte maior.
   */
  function selecionarCidade(novaCidade: string) {
    atualizarParams({ cidade: novaCidade || undefined });
    registrarEvento("busca", { termo: termoBusca || undefined, cidade: novaCidade || undefined, aba });
  }

  function selecionarEstado(novoEstado: string) {
    // "BR" explícito (não ausência do param) quando o usuário limpa de
    // propósito — sem isso, a página detecta o estado por geolocalização
    // de novo no próximo carregamento (ver app/page.tsx) e "Todos os
    // estados" nunca conseguiria mostrar o Brasil inteiro de fato.
    // Persiste a escolha pra sobreviver à navegação (ex.: voltar de um
    // anúncio) com prioridade sobre o GEO — ver lib/estadoPreferido.ts.
    salvarEstadoPreferido(novoEstado || "BR");
    atualizarParams({ estado: novoEstado || "BR" });
    registrarEvento("busca", { termo: termoBusca || undefined, estado: novoEstado || undefined, aba });
  }

  const podeSelecionarVarios = usuario?.role === "admin" && aba !== "favoritos";
  // Anunciar grátis é perk de PRO/admin → /enviar. Todo o resto (deslogado OU
  // não-PRO) vai DIRETO pro produto pago /vender — sem passar por login (a conta
  // nasce no pagamento). Ver project_repasse_livre_low_ticket_vender_anuncio.
  const hrefAnunciar = usuario?.premium || usuario?.role === "admin" ? "/enviar" : "/vender";

  return (
    <div className="top-bar">
      <div className="top-bar-linha-principal">
        <Link href="/" className="logo-link" aria-label={tx("paginaInicial")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-autoradar.png" alt="AutoRadarPy" className="logo-img" />
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
              placeholder={tx("buscarVeiculo")}
              className="busca-slim-input"
              autoFocus={buscaAberta}
            />
            <select
              value={cidade ?? ""}
              onChange={(evento) => selecionarCidade(evento.target.value)}
              className="busca-slim-uf"
              aria-label={tx("filtrarPorCidade")}
            >
              <option value="">{rotuloEstadoCompacto ? tx("cidadeCurto") : tx("todasCidades")}</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={aoClicarBuscar}
              className="busca-slim-botao"
              aria-label={tx("buscar")}
              title={tx("buscar")}
            >
              <Search size={18} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => setBuscaAberta(false)}
              className="busca-slim-fechar"
              aria-label={tx("fecharBusca")}
              title={tx("fecharBusca")}
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </div>
        )}
        <Link href={hrefAnunciar} className="botao-anunciar">
          <Plus size={16} strokeWidth={2.25} />
          {tx("anunciar")}
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
            aria-label={tx("buscar")}
            title={tx("buscar")}
          >
            <Search size={18} strokeWidth={2.25} />
          </button>
        )}
        <Link href={hrefAnunciar} className="botao-anunciar-compacto" aria-label={tx("anunciar")} title={tx("anunciar")}>
          <Plus size={18} strokeWidth={2.25} />
        </Link>
        {/* ★ Idioma e moeda ficam FIXOS aqui, fora do modo de seleção: são
            preferência de leitura, não ação sobre anúncio. Esconder no menu do
            usuário obrigaria a estar logado para trocar de idioma. */}
        {!modoSelecao && <SeletorMoeda />}
        {!modoSelecao && <SeletorIdioma />}
        <UserMenu usuario={usuario} />
      </div>
    </div>
  );
}
