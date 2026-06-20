"use client";

import { useState, useTransition } from "react";
import { alternarFavorito, apagarOportunidade, aprovarOportunidade, rejeitarOportunidade } from "@/app/actions";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { ROTULO_PERFIL_REMETENTE } from "@/lib/perfilRemetente";
import { formatarWhatsapp } from "@/lib/mascaras";
import type { Oportunidade } from "@/lib/types";

const CLASSE_FONTE: Record<string, string> = {
  OLX: "selo-fonte-olx",
  Webmotors: "selo-fonte-webmotors",
  "Mercado Livre": "selo-fonte-mercadolivre",
};

function formatarDataCaptura(dataIso: string): string {
  return new Date(dataIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  function executarAcao(acao: () => Promise<void>, mensagemErro: string) {
    iniciarTransicao(async () => {
      try {
        await acao();
      } catch {
        mostrarFeedback(mensagemErro);
      }
    });
  }

  function aoApagar() {
    if (!window.confirm("Apagar esta oportunidade definitivamente? A contagem fica preservada no histórico.")) {
      return;
    }
    executarAcao(() => apagarOportunidade(oportunidade.id), "Falha ao apagar. Tente novamente.");
  }

  const classeFonte = CLASSE_FONTE[oportunidade.fonte] ?? "selo-fonte-generico";
  const classificacao = oportunidade.classificacao as Classificacao | null;
  const classeClassificacao = classificacao
    ? CLASSE_CLASSIFICACAO[classificacao] ?? "selo-classificacao-oportunidade"
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
        {classificacao && (
          <span className={`selo-classificacao ${classeClassificacao}`}>
            {ROTULO_CLASSIFICACAO[classificacao]}
          </span>
        )}
      </div>

      <div className="card-corpo">
        <p className="titulo">{oportunidade.veiculo}</p>
        <p className="local">
          {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
          {oportunidade.cambio ? ` · Câmbio ${oportunidade.cambio.toLowerCase()}` : ""}
        </p>
        <p className="data-descoberta">
          🕒 Publicado em{" "}
          {formatarDataCaptura(oportunidade.data_publicacao_origem ?? oportunidade.data_captura)}
        </p>

        <div className="linha-preco">
          <span className="preco-rotulo">Anunciado por</span>
          <span className="preco-valor">{formatarMoeda(oportunidade.preco)}</span>
        </div>
        <div className="linha-preco">
          <span className="preco-rotulo">Tabela FIPE</span>
          <span>{formatarMoeda(oportunidade.fipe_valor)}</span>
        </div>

        {oportunidade.whatsapp && (
          <p className="info-remetente">
            📱{" "}
            <a
              href={`https://wa.me/55${oportunidade.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="link-whatsapp"
            >
              {formatarWhatsapp(oportunidade.whatsapp)}
            </a>
            {oportunidade.perfil_remetente && ` · ${ROTULO_PERFIL_REMETENTE[oportunidade.perfil_remetente]}`}
          </p>
        )}

        {!oportunidade.link_origem.startsWith("insercao-direta:") && (
          <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
            <span>🔗 Abrir anúncio original</span>
            <span aria-hidden="true">›</span>
          </a>
        )}
      </div>

      {feedback && <p className="card-feedback">{feedback}</p>}

      <div className="acoes">
        <button
          disabled={pendente}
          onClick={() =>
            executarAcao(() => aprovarOportunidade(oportunidade.id), "Falha ao aprovar. Tente novamente.")
          }
          className="acao acao-aprovar"
        >
          Aprovar
        </button>
        {oportunidade.status === "rejeitada" ? (
          <button disabled={pendente} onClick={aoApagar} className="acao acao-rejeitar">
            Apagar
          </button>
        ) : (
          <button
            disabled={pendente}
            onClick={() =>
              executarAcao(() => rejeitarOportunidade(oportunidade.id), "Falha ao rejeitar. Tente novamente.")
            }
            className="acao acao-rejeitar"
          >
            Rejeitar
          </button>
        )}
        <button
          disabled={pendente}
          onClick={() =>
            executarAcao(
              () => alternarFavorito(oportunidade.id, oportunidade.favorito),
              "Falha ao favoritar. Tente novamente."
            )
          }
          className="acao"
        >
          {oportunidade.favorito ? "Favoritado" : "Favoritar"}
        </button>
        <button onClick={aoCompartilhar} className="acao">
          Compartilhar
        </button>
      </div>
    </div>
  );
}
