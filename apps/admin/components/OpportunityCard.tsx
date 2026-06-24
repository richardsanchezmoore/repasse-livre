"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Heart, MapPin, MessageCircle, Share2, Tag } from "lucide-react";
import {
  alternarFavoritoUsuario,
  apagarOportunidade,
  aprovarOportunidade,
  rejeitarOportunidade,
} from "@/app/actions";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { ROTULO_MOTIVO_VENDA } from "@/lib/motivoVenda";
import { formatarWhatsapp } from "@/lib/mascaras";
import { formatarDataCaptura, formatarMoeda } from "@/lib/formatadores";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";
import type { Oportunidade } from "@/lib/types";

const CLASSE_FONTE: Record<string, string> = {
  OLX: "selo-fonte-olx",
  Webmotors: "selo-fonte-webmotors",
  "Mercado Livre": "selo-fonte-mercadolivre",
};

export function OpportunityCard({
  oportunidade,
  favoritado,
  isAdmin,
  usuarioLogado,
}: {
  oportunidade: Oportunidade;
  favoritado: boolean;
  isAdmin: boolean;
  usuarioLogado: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mostrarPopupLogin, setMostrarPopupLogin] = useState(false);
  const { modoSelecao, selecionados, alternarSelecionado } = useSelecaoMultipla();
  const selecionado = selecionados.has(oportunidade.id);

  function aoClicarCard() {
    if (isAdmin && modoSelecao) {
      alternarSelecionado(oportunidade.id);
      return;
    }
    router.push(`/oportunidade/${oportunidade.id}`);
  }

  function mostrarFeedback(texto: string, duracaoMs = 1500) {
    setFeedback(texto);
    setTimeout(() => setFeedback(null), duracaoMs);
  }

  async function aoCompartilhar(evento: React.MouseEvent) {
    evento.stopPropagation();
    try {
      await navigator.clipboard.writeText(gerarTextoCompartilhamento(oportunidade));
      mostrarFeedback("Você já pode colar as informações direto no WhatsApp!", 2500);
    } catch {
      mostrarFeedback("Não foi possível copiar. Tente novamente.", 2500);
    }
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

  function aoFavoritar() {
    if (!usuarioLogado) {
      setMostrarPopupLogin(true);
      return;
    }
    executarAcao(() => alternarFavoritoUsuario(oportunidade.id), "Falha ao favoritar. Tente novamente.");
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

  const titulo =
    oportunidade.origem_tipo === "insercao_direta" && oportunidade.versao
      ? oportunidade.versao
      : oportunidade.veiculo;

  return (
    <div className="card card-clicavel" onClick={aoClicarCard}>
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
        {!(isAdmin && modoSelecao) && (
          <span className={`selo-fonte ${classeFonte}`}>{oportunidade.fonte}</span>
        )}
        {isAdmin && modoSelecao && (
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              alternarSelecionado(oportunidade.id);
            }}
            className={`checkbox-selecao ${selecionado ? "checkbox-selecao-marcado" : ""}`}
            aria-label={selecionado ? "Remover da seleção" : "Adicionar à seleção"}
            title={selecionado ? "Remover da seleção" : "Adicionar à seleção"}
          >
            {selecionado && <Check size={16} strokeWidth={2.5} />}
          </button>
        )}
        <button
          type="button"
          disabled={pendente}
          onClick={(evento) => {
            evento.stopPropagation();
            aoFavoritar();
          }}
          className={`botao-favorito ${favoritado ? "botao-favorito-ativo" : ""}`}
          aria-label={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          title={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart size={21.6} strokeWidth={2} fill={favoritado ? "currentColor" : "none"} />
        </button>
      </div>

      {mostrarPopupLogin && (
        <div
          className="popup-favorito-overlay"
          onClick={(evento) => {
            evento.stopPropagation();
            setMostrarPopupLogin(false);
          }}
        >
          <div className="popup-favorito" onClick={(evento) => evento.stopPropagation()}>
            <button
              type="button"
              className="popup-favorito-fechar"
              onClick={() => setMostrarPopupLogin(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <Heart size={32} strokeWidth={2} fill="currentColor" className="popup-favorito-icone" />
            <p className="popup-favorito-texto">
              Entre em sua conta para favoritar e acompanhar as negociações de onde estiver!
            </p>
            <Link href="/login" className="popup-favorito-login" onClick={() => setMostrarPopupLogin(false)}>
              Fazer Login
            </Link>
          </div>
        </div>
      )}

      {classificacao && (
        <span className={`selo-classificacao ${classeClassificacao}`}>
          {ROTULO_CLASSIFICACAO[classificacao]}
        </span>
      )}

      <div className="card-corpo">
        <p className="titulo">{titulo}</p>

        <div className="destaque-margem">
          <p className="destaque-margem-valor-rotulo">Ganho</p>
          <p className="destaque-margem-valor">{formatarMoeda(diferencaValor)}</p>
          <p className="destaque-margem-percentual">
            <span className="destaque-margem-percentual-rotulo">Margem de</span>{" "}
            {oportunidade.margem_percentual?.toFixed(1)}%{" "}
            <span className="destaque-margem-percentual-rotulo">abaixo da FIPE</span>
          </p>
        </div>

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
            <MessageCircle size={14} strokeWidth={1.75} className="icone-inline" />{" "}
            <a
              href={`https://wa.me/55${oportunidade.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="link-whatsapp"
              onClick={(evento) => evento.stopPropagation()}
            >
              {formatarWhatsapp(oportunidade.whatsapp)}
            </a>
            {oportunidade.nome_remetente && ` · ${oportunidade.nome_remetente}`}
          </p>
        )}

        {oportunidade.motivo_venda && (
          <p className="motivo-venda">
            <Tag size={14} strokeWidth={1.75} className="icone-inline" /> Motivo da venda:{" "}
            {ROTULO_MOTIVO_VENDA[oportunidade.motivo_venda]}
          </p>
        )}
      </div>

      {feedback && <p className="card-feedback">{feedback}</p>}

      {!(isAdmin && modoSelecao) && (
      <div className="acoes" onClick={(evento) => evento.stopPropagation()}>
        {isAdmin && (
          <button
            disabled={pendente}
            onClick={() =>
              executarAcao(() => aprovarOportunidade(oportunidade.id), "Falha ao aprovar. Tente novamente.")
            }
            className="acao acao-aprovar"
          >
            Aprovar
          </button>
        )}
        {isAdmin &&
          (oportunidade.status === "rejeitada" ? (
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
          ))}
        <button onClick={aoCompartilhar} className="acao acao-compartilhar">
          <Share2 size={14} strokeWidth={2} className="icone-inline" /> Compartilhar
        </button>
      </div>
      )}
    </div>
  );
}
