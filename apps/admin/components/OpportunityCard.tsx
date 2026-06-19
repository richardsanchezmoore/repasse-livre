"use client";

import { useState, useTransition } from "react";
import { alternarFavorito, aprovarOportunidade, rejeitarOportunidade } from "@/app/actions";
import type { Oportunidade } from "@/lib/types";

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  oportunidade: "Oportunidade",
  grande_oportunidade: "Grande oportunidade",
  oportunidade_premium: "Oportunidade premium",
  top_oportunidade: "Top oportunidade",
};

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OpportunityCard({ oportunidade }: { oportunidade: Oportunidade }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [copiado, setCopiado] = useState(false);

  function aoCopiar() {
    navigator.clipboard.writeText(oportunidade.link_origem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="card">
      <div className="card-top">
        {oportunidade.foto_principal ? (
          <img src={oportunidade.foto_principal} alt="" className="thumb" />
        ) : (
          <div className="thumb thumb-vazio" />
        )}
        <div className="card-info">
          <p className="titulo">{oportunidade.veiculo}</p>
          <p className="local">
            {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
          </p>
          <span className="badge">
            {oportunidade.margem_percentual?.toFixed(1)}% abaixo da FIPE
            {oportunidade.classificacao ? ` · ${ROTULO_CLASSIFICACAO[oportunidade.classificacao] ?? ""}` : ""}
          </span>
        </div>
        <span className="fonte">{oportunidade.fonte}</span>
      </div>

      <div className="precos">
        <span>{formatarMoeda(oportunidade.preco)}</span>
        <span className="fipe">FIPE {formatarMoeda(oportunidade.fipe_valor)}</span>
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
        <button onClick={aoCopiar} className="acao">
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
