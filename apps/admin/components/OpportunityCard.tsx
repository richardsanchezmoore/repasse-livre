"use client";

import { useState, useTransition } from "react";
import { alternarFavorito, aprovarOportunidade, rejeitarOportunidade } from "@/app/actions";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import type { Oportunidade } from "@/lib/types";

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

  return (
    <div className="card">
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

      <div className="card-corpo">
        <p className="titulo">{oportunidade.veiculo}</p>
        <p className="local">
          {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
        </p>

        <span className="badge">{oportunidade.margem_percentual?.toFixed(1)}% abaixo da FIPE</span>

        <div className="detalhes-grid">
          <div className="detalhe">
            <p className="detalhe-rotulo">Versão</p>
            <p className="detalhe-valor">{oportunidade.versao ?? "—"}</p>
          </div>
          <div className="detalhe">
            <p className="detalhe-rotulo">Câmbio</p>
            <p className="detalhe-valor">{oportunidade.cambio ?? "—"}</p>
          </div>
        </div>

        <div className="linha-preco">
          <span className="preco-rotulo">Anunciado por</span>
          <span className="preco-valor">{formatarMoeda(oportunidade.preco)}</span>
        </div>
        <div className="linha-preco">
          <span className="preco-rotulo">Tabela FIPE</span>
          <span>{formatarMoeda(oportunidade.fipe_valor)}</span>
        </div>

        <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
          <span>Ver anúncio na OLX</span>
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
