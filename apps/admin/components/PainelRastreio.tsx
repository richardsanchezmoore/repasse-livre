"use client";

import { useState, useTransition } from "react";
import { salvarConfigRastreio } from "@/app/actions";
import { CHAVES_RASTREIO, type ChaveRastreio } from "@/lib/rastreio";

const CAMPOS: Array<{ chave: ChaveRastreio; rotulo: string; ajuda: string; multilinha?: boolean }> = [
  {
    chave: "ga_measurement_id",
    rotulo: "Google Analytics — Measurement ID",
    ajuda: 'Formato "G-XXXXXXXXXX", encontrado em Admin > Fluxos de dados no GA4.',
  },
  {
    chave: "gtm_id",
    rotulo: "Google Tag Manager — Container ID",
    ajuda: 'Formato "GTM-XXXXXXX". Deixe em branco se não usa GTM.',
  },
  {
    chave: "meta_pixel_id",
    rotulo: "Meta Pixel — ID",
    ajuda: "ID numérico do pixel, encontrado no Gerenciador de Eventos do Meta.",
  },
  {
    chave: "scripts_extra",
    rotulo: "Scripts adicionais (avançado)",
    ajuda: "Cole aqui qualquer outro snippet <script> de rastreio. Inserido no final do <body>.",
    multilinha: true,
  },
];

export function PainelRastreio({ config }: { config: Record<ChaveRastreio, string> }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<ChaveRastreio, string>>(() =>
    Object.fromEntries(CHAVES_RASTREIO.map((chave) => [chave, config[chave] ?? ""])) as Record<ChaveRastreio, string>
  );

  function alterarCampo(chave: ChaveRastreio, valor: string) {
    setValores((anterior) => ({ ...anterior, [chave]: valor }));
  }

  function salvarCampo(chave: ChaveRastreio) {
    setErro(null);
    setMensagem(null);
    setSalvandoChave(chave);
    iniciarTransicao(async () => {
      try {
        await salvarConfigRastreio(chave, valores[chave].trim());
        setMensagem("Configuração de rastreio salva.");
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao salvar.");
      } finally {
        setSalvandoChave(null);
      }
    });
  }

  return (
    <section className="worker-secao">
      <h2 className="worker-secao-titulo">Códigos de rastreio</h2>
      <p className="worker-config-ajuda">
        Cole os IDs/snippets abaixo — são inseridos automaticamente nas páginas públicas do site.
      </p>
      <div className="worker-config-grade">
        {CAMPOS.map((campo) => (
          <div key={campo.chave} className="worker-config-campo">
            <label className="worker-config-rotulo" htmlFor={`rastreio-${campo.chave}`}>
              {campo.rotulo}
            </label>
            <div className="worker-config-linha">
              {campo.multilinha ? (
                <textarea
                  id={`rastreio-${campo.chave}`}
                  className="worker-config-input"
                  rows={4}
                  value={valores[campo.chave]}
                  onChange={(evento) => alterarCampo(campo.chave, evento.target.value)}
                />
              ) : (
                <input
                  id={`rastreio-${campo.chave}`}
                  type="text"
                  className="worker-config-input"
                  value={valores[campo.chave]}
                  onChange={(evento) => alterarCampo(campo.chave, evento.target.value)}
                />
              )}
              <button
                type="button"
                className="worker-config-salvar"
                disabled={pendente && salvandoChave === campo.chave}
                onClick={() => salvarCampo(campo.chave)}
              >
                {pendente && salvandoChave === campo.chave ? "Salvando…" : "Salvar"}
              </button>
            </div>
            <p className="worker-config-ajuda">{campo.ajuda}</p>
          </div>
        ))}
      </div>
      {erro && <p className="campo-erro">{erro}</p>}
      {mensagem && <p className="worker-mensagem">{mensagem}</p>}
    </section>
  );
}
