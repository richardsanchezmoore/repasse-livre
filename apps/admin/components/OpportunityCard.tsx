"use client";

import { useState, useTransition } from "react";
import { Calendar, Clock, ExternalLink, Gauge, MapPin, MessageCircle } from "lucide-react";
import { alternarFavorito, apagarOportunidade, aprovarOportunidade, rejeitarOportunidade } from "@/app/actions";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { ROTULO_PERFIL_REMETENTE } from "@/lib/perfilRemetente";
import { ROTULO_MOTIVO_VENDA } from "@/lib/motivoVenda";
import { formatarWhatsapp } from "@/lib/mascaras";
import type { Oportunidade } from "@/lib/types";

const CLASSE_FONTE: Record<string, string> = {
  OLX: "selo-fonte-olx",
  Webmotors: "selo-fonte-webmotors",
  "Mercado Livre": "selo-fonte-mercadolivre",
};

function formatarDataCaptura(dataIso: string): string {
  const data = new Date(dataIso);
  const horario = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date();
  const ehHoje =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear();

  if (ehHoje) return `Hoje, ${horario}`;
  return `${data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${horario}`;
}

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toLocaleString("pt-BR")} km`;
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

  const diferencaValor =
    oportunidade.fipe_valor !== null ? oportunidade.fipe_valor - oportunidade.preco : null;

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

      {classificacao && (
        <span className={`selo-classificacao ${classeClassificacao}`}>
          {ROTULO_CLASSIFICACAO[classificacao]}
        </span>
      )}

      <div className="card-corpo">
        <p className="titulo">{oportunidade.veiculo}</p>

        <div className="destaque-margem">
          <p className="destaque-margem-valor-rotulo">Ganho</p>
          <p className="destaque-margem-valor">{formatarMoeda(diferencaValor)}</p>
          <p className="destaque-margem-percentual">
            <span className="destaque-margem-percentual-rotulo">Margem de</span>{" "}
            {oportunidade.margem_percentual?.toFixed(1)}%{" "}
            <span className="destaque-margem-percentual-rotulo">abaixo da FIPE</span>
          </p>
        </div>

        <p className="ano-km">
          <span className="ano-km-item">
            <Calendar size={13} strokeWidth={1.75} className="icone-inline" /> {oportunidade.ano ?? "—"}
          </span>
          <span className="ano-km-item">
            <Gauge size={13} strokeWidth={1.75} className="icone-inline" /> {formatarKm(oportunidade.km)}
          </span>
        </p>

        <div className="precos-grupo">
          <div className="linha-preco linha-preco-anuncio">
            <span className="preco-rotulo">Preço</span>
            <span className="preco-valor">{formatarMoeda(oportunidade.preco)}</span>
          </div>
          <div className="linha-preco linha-preco-fipe">
            <span className="preco-rotulo">FIPE</span>
            <span>{formatarMoeda(oportunidade.fipe_valor)}</span>
          </div>
        </div>

        <p className="data-local">
          <span className="data-local-item">
            <Clock size={12} strokeWidth={1.75} className="icone-inline" />{" "}
            {formatarDataCaptura(oportunidade.data_publicacao_origem ?? oportunidade.data_captura)}
          </span>
          <span className="data-local-item">
            <MapPin size={13} strokeWidth={1.75} className="icone-inline" />{" "}
            {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
          </span>
        </p>

        {oportunidade.whatsapp && (
          <p className="info-remetente">
            <MessageCircle size={12} strokeWidth={1.75} className="icone-inline" />{" "}
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

        {oportunidade.motivo_venda && (
          <p className="motivo-venda">Motivo da venda: {ROTULO_MOTIVO_VENDA[oportunidade.motivo_venda]}</p>
        )}

        {!oportunidade.link_origem.startsWith("insercao-direta:") && (
          <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
            <span className="link-origem-texto">
              <ExternalLink size={14} strokeWidth={1.75} className="icone-inline" /> Abrir anúncio original
            </span>
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
