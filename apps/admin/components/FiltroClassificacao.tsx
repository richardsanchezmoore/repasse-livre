"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { CLASSIFICACOES, ROTULO_CLASSIFICACAO_FILTRO, type Classificacao } from "@/lib/classificacao";
import { apenasDigitos, formatarMoeda } from "@/lib/mascaras";
import { registrarEvento } from "@/lib/eventosAnalytics";
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
  anoMin,
  anoMax,
  anunciante,
  fonte,
  proximidadeDisponivel = false,
}: {
  aba: Aba;
  ativa?: Classificacao;
  ordem?: Ordem;
  precoMin?: number;
  precoMax?: number;
  anoMin?: string;
  anoMax?: string;
  anunciante?: "profissional" | "particular";
  fonte?: string;
  proximidadeDisponivel?: boolean;
}) {
  // "Perto de mim" só aparece quando temos coordenada do usuário (ver
  // lib/geolocalizacao.ts) — sem isso a opção não faria sentido na lista.
  const ORDENS: Ordem[] = proximidadeDisponivel ? ["proximidade", ...ORDENS_BASE] : ORDENS_BASE;
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [minDigitos, setMinDigitos] = useState(precoMin ? String(precoMin) : "");
  const [maxDigitos, setMaxDigitos] = useState(precoMax ? String(precoMax) : "");
  const [anoMinDigitos, setAnoMinDigitos] = useState(anoMin ?? "");
  const [anoMaxDigitos, setAnoMaxDigitos] = useState(anoMax ?? "");
  // Anunciante e fonte ficam "pendentes" (staged) no painel — só valem quando o
  // usuário clica em "Aplicar" (nem todos percebem que seria automático).
  const [anuncianteLocal, setAnuncianteLocal] = useState(anunciante);
  const [fonteLocal, setFonteLocal] = useState(fonte);
  const [chipsAbertos, setChipsAbertos] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // O drawer é portalizado pro body (fora do contexto de empilhamento aninhado,
  // senão a TopBar fica por cima). Só monta no client.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Enquanto o painel de Filtros está aberto: ESC fecha e o scroll da página
  // fica travado (o painel tem scroll próprio). Mesmo padrão do menu lateral.
  useEffect(() => {
    if (!filtrosAbertos) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setFiltrosAbertos(false);
    }
    document.addEventListener("keydown", aoTeclar);
    const overflowAntigo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAntigo;
    };
  }, [filtrosAbertos]);

  const FONTES: { valor: string; rotulo: string }[] = [
    { valor: "OLX", rotulo: "OLX" },
    { valor: "WEBMOTORS", rotulo: "Webmotors" },
    { valor: "MERCADO_LIVRE", rotulo: "Mercado Livre" },
  ];

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
    registrarEvento("busca", { filtro: "classificacao", classificacao, aba });
  }

  function selecionarAnunciante(novoAnunciante?: "profissional" | "particular") {
    setAnuncianteLocal(novoAnunciante);
  }

  function selecionarOrdem(novaOrdem: Ordem) {
    // Sempre grava o valor explícito (mesmo "recente") — quando há
    // coordenada do usuário, a ausência do param vira "proximidade" por
    // padrão (ver page.tsx), então só assim dá pra escolher "recente" de
    // propósito e isso sobreviver a um refresh.
    atualizarParams({ ordem: novaOrdem });
    registrarEvento("busca", { filtro: "ordem", ordem: novaOrdem, aba });
  }

  function selecionarFonte(novaFonte: string) {
    // Todas ativas por padrão; clicar numa deixa só ela pendente; clicar de
    // novo na ativa volta pra todas. Só vale no "Aplicar".
    setFonteLocal((atual) => (atual === novaFonte ? undefined : novaFonte));
  }

  function aplicarFiltros() {
    atualizarParams({
      precoMin: minDigitos || undefined,
      precoMax: maxDigitos || undefined,
      anoMin: anoMinDigitos || undefined,
      anoMax: anoMaxDigitos || undefined,
      anunciante: anuncianteLocal,
      fonte: fonteLocal,
    });
    registrarEvento("busca", { filtro: "painel", aba });
    setFiltrosAbertos(false);
  }

  function limparFiltros() {
    setMinDigitos("");
    setMaxDigitos("");
    setAnoMinDigitos("");
    setAnoMaxDigitos("");
    setAnuncianteLocal(undefined);
    setFonteLocal(undefined);
    atualizarParams({
      precoMin: undefined,
      precoMax: undefined,
      anoMin: undefined,
      anoMax: undefined,
      anunciante: undefined,
      fonte: undefined,
    });
  }

  // O ícone de Filtros fica "ativo" (destacado) se qualquer filtro do painel
  // estiver aplicado.
  const algumFiltroAtivo = Boolean(precoMin || precoMax || anoMin || anoMax || anunciante || fonte);

  return (
    <div className="filtro-classificacao">
      <button
        type="button"
        className="filtro-toggle-mobile"
        onClick={() => setChipsAbertos((aberto) => !aberto)}
        aria-expanded={chipsAbertos}
      >
        <span>{ativa ? ROTULO_CLASSIFICACAO_FILTRO[ativa] : "Margem FIPE"}</span>
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
        <span className="filtro-ordenacao-label">
          <span className="filtro-ordenacao-label-completo">Ordenar por:</span>
          <span className="filtro-ordenacao-label-curto">Ordenar</span>
        </span>
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

        <button
          type="button"
          className={`icon-dropdown-botao icon-dropdown-botao-com-texto ${
            algumFiltroAtivo ? "icon-dropdown-botao-ativo" : ""
          }`}
          onClick={() => setFiltrosAbertos(true)}
          aria-label="Filtros"
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} />
          <span className="icon-dropdown-botao-rotulo">Filtros</span>
        </button>
      </div>

      {montado &&
        createPortal(
          <>
            <div
              className={`painel-filtros-backdrop ${filtrosAbertos ? "painel-filtros-aberto" : ""}`}
              onClick={() => setFiltrosAbertos(false)}
              aria-hidden
            />
            <aside className={`painel-filtros ${filtrosAbertos ? "painel-filtros-aberto" : ""}`} aria-label="Filtros">
        <header className="painel-filtros-topo">
          <h2 className="painel-filtros-titulo">Filtros</h2>
          <button
            type="button"
            className="painel-filtros-fechar"
            onClick={() => setFiltrosAbertos(false)}
            aria-label="Fechar filtros"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>
        <div className="painel-filtros-corpo">
          <p className="icon-dropdown-titulo">Faixa de Preço</p>
          <div className="icon-dropdown-faixa">
            <input
              id="preco-min"
              type="text"
              inputMode="numeric"
              placeholder="Min."
              value={formatarMoeda(minDigitos)}
              onChange={(evento) => setMinDigitos(apenasDigitos(evento.target.value))}
            />
            <span className="icon-dropdown-faixa-tra">–</span>
            <input
              id="preco-max"
              type="text"
              inputMode="numeric"
              placeholder="Max."
              value={formatarMoeda(maxDigitos)}
              onChange={(evento) => setMaxDigitos(apenasDigitos(evento.target.value))}
            />
          </div>

          <p className="icon-dropdown-titulo icon-dropdown-secao">Faixa de Ano</p>
          <div className="icon-dropdown-faixa">
            <input
              id="ano-min"
              type="text"
              inputMode="numeric"
              placeholder="Do ano"
              maxLength={4}
              value={anoMinDigitos}
              onChange={(evento) => setAnoMinDigitos(apenasDigitos(evento.target.value).slice(0, 4))}
            />
            <span className="icon-dropdown-faixa-tra">–</span>
            <input
              id="ano-max"
              type="text"
              inputMode="numeric"
              placeholder="Até ano"
              maxLength={4}
              value={anoMaxDigitos}
              onChange={(evento) => setAnoMaxDigitos(apenasDigitos(evento.target.value).slice(0, 4))}
            />
          </div>

          <p className="icon-dropdown-titulo icon-dropdown-secao">Tipo de anunciante</p>
          <div className="painel-filtros-opcoes">
            <button
              type="button"
              className={`icon-dropdown-opcao ${!anuncianteLocal ? "icon-dropdown-opcao-ativa" : ""}`}
              onClick={() => selecionarAnunciante(undefined)}
            >
              Todos
            </button>
            <button
              type="button"
              className={`icon-dropdown-opcao ${anuncianteLocal === "particular" ? "icon-dropdown-opcao-ativa" : ""}`}
              onClick={() => selecionarAnunciante("particular")}
            >
              Particular
            </button>
            <button
              type="button"
              className={`icon-dropdown-opcao ${anuncianteLocal === "profissional" ? "icon-dropdown-opcao-ativa" : ""}`}
              onClick={() => selecionarAnunciante("profissional")}
            >
              Profissional
            </button>
          </div>

          <p className="icon-dropdown-titulo icon-dropdown-secao">Fontes</p>
          <div className="filtro-fontes">
            {FONTES.map((f) => (
              <button
                key={f.valor}
                type="button"
                className={`filtro-fonte-chip ${
                  fonteLocal === f.valor
                    ? "filtro-fonte-chip-ativo"
                    : fonteLocal
                      ? "filtro-fonte-chip-inativo"
                      : ""
                }`}
                onClick={() => selecionarFonte(f.valor)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
            <footer className="painel-filtros-rodape">
              <button type="button" className="painel-filtros-limpar" onClick={limparFiltros}>
                Limpar Filtros
              </button>
              <button type="button" className="painel-filtros-aplicar" onClick={aplicarFiltros}>
                Aplicar
              </button>
            </footer>
            </aside>
          </>,
          document.body
        )}
    </div>
  );
}
