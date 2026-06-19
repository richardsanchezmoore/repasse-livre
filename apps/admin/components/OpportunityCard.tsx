"use client";

import { useState, useTransition } from "react";
import { alternarFavorito, aprovarOportunidade, rejeitarOportunidade } from "@/app/actions";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import type { Oportunidade } from "@/lib/types";

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  oportunidade: "Oportunidade",
  grande_oportunidade: "Grande oportunidade",
  oportunidade_premium: "Oportunidade premium",
  top_oportunidade: "Top oportunidade",
};

const CLASSE_CLASSIFICACAO: Record<string, string> = {
  oportunidade: "selo-classificacao-oportunidade",
  grande_oportunidade: "selo-classificacao-grande",
  oportunidade_premium: "selo-classificacao-premium",
  top_oportunidade: "selo-classificacao-top",
};

const CLASSE_FONTE: Record<string, string> = {
  OLX: "selo-fonte-olx",
  Webmotors: "selo-fonte-webmotors",
  "Mercado Livre": "selo-fonte-mercadolivre",
};

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OpportunityCard({ oportunidade }: { oportunidade: Oportunidade }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function mostrarFeedback(texto: string) {
    setFeedback(texto);
    setTimeout(() => setFeedback(null), 1500);
  }

  async function aoCompartilhar() {
    await navigator.clipboard.writeText(gerarTextoCompartilhamento(oportunidade));
    mostrarFeedback("Texto copiado!");
  }

  const classeFonte = CLASSE_FONTE[oportunidade.fonte] ?? "selo-fonte-generico";
  const classeClassificacao = oportunidade.classificacao
    ? CLASSE_CLASSIFICACAO[oportunidade.classificacao] ?? "selo-classificacao-oportunidade"
    : "selo-classificacao-oportunidade";

  return (
    <div className="card">
      <div className="foto-wrapper">
        {oportunidade.foto_principal ? (
          <img
            src={oportunidade.foto_principal}
            alt=""
            className="foto-capa"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="foto-capa foto-capa-vazia" />
        )}
        <span className={`selo-fonte ${classeFonte}`}>{oportunidade.fonte}</span>
      </div>

      <div className="destaque-margem">
        <p className="destaque-margem-rotulo">Margem sobre a FIPE</p>
        <p className="destaque-margem-valor">{oportunidade.margem_percentual?.toFixed(1)}%</p>
        {oportunidade.classificacao && (
          <span className={`selo-classificacao ${classeClassificacao}`}>
            {ROTULO_CLASSIFICACAO[oportunidade.classificacao]}
          </span>
        )}
      </div>

      <div className="card-corpo">
        <p className="titulo">{oportunidade.veiculo}</p>
        <p className="local">
          {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
          {oportunidade.cambio ? ` · Câmbio ${oportunidade.cambio.toLowerCase()}` : ""}
        </p>

        <div className="linha-preco">
          <span className="preco-rotulo">Anunciado por</span>
          <span className="preco-valor">{formatarMoeda(oportunidade.preco)}</span>
        </div>
        <div className="linha-preco">
          <span className="preco-rotulo">Tabela FIPE</span>
          <span>{formatarMoeda(oportunidade.fipe_valor)}</span>
        </div>

        <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
          <span>Ver anúncio na {oportunidade.fonte}</span>
          <span aria-hidden="true">›</span>
        </a>
      </div>

      <div className="acoes">
        <button
          disabled={pendente}
          onClick={() => iniciarTransicao(() => aprovarOportunidade(oportunidade.id))}
          className="acao acao-aprovar"
        >
          Aprovar
        </button>
        <button
          disabled={pendente}
          onClick={() => iniciarTransicao(() => rejeitarOportunidade(oportunidade.id))}
          className="acao acao-rejeitar"
        >
          Rejeitar
        </button>
        <button
          disabled={pendente}
          onClick={() => iniciarTransicao(() => alternarFavorito(oportunidade.id, oportunidade.favorito))}
          className="acao"
        >
          {oportunidade.favorito ? "Favoritado" : "Favoritar"}
        </button>
        <button onClick={aoCompartilhar} className="acao">
          {feedback ?? "Compartilhar"}
        </button>
      </div>
    </div>
  );
}
