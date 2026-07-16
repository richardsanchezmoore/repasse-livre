"use client";

import { useEffect, useState } from "react";
import { TrendingDown, X, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { infoFonte } from "@/lib/fonte";
import { formatarMoeda } from "@/lib/formatadores";
import { registrarEvento } from "@/lib/eventosAnalytics";
import type { OfertaDemo } from "@/lib/ofertaDemo";

/**
 * "Experimente agora" da /planos — o visitante de campanha abre um anúncio REAL
 * (o configurado em DEMO_OPPORTUNITY_ID) com o Copiloto e o acesso liberados,
 * dentro de um MODAL (iframe da própria página real com ?embed=1), sem sair da
 * página de vendas. O gatilho REPLICA o card real (mesmas classes: Ganho →
 * margem → Oferta/FIPE → selo) pra ser fiel ao produto.
 */
export function ExperimenteDemo({ oferta }: { oferta: OfertaDemo }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  function abrir() {
    setCarregando(true);
    setAberto(true);
    registrarEvento("clique_experimentar_demo", { origem: "planos" });
  }

  function irParaAssinatura() {
    setAberto(false);
    document.getElementById("oferta")?.scrollIntoView({ behavior: "smooth" });
  }

  const titulo = oferta.veiculo;
  const ganho = oferta.fipe_valor != null ? oferta.fipe_valor - oferta.preco : null;
  const classe = oferta.classificacao ? CLASSE_CLASSIFICACAO[oferta.classificacao as Classificacao] : "";
  const rotuloClasse = oferta.classificacao ? ROTULO_CLASSIFICACAO[oferta.classificacao as Classificacao] : null;
  const rotuloFonte = infoFonte(oferta.fonte).rotulo;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="demo-gatilho"
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrir();
          }
        }}
      >
        <div
          className="demo-gatilho-foto"
          style={oferta.foto_principal ? { backgroundImage: `url(${oferta.foto_principal})` } : undefined}
        >
          {oferta.margem_percentual != null && (
            <span className="demo-gatilho-margem">
              <TrendingDown size={15} strokeWidth={2.4} /> {oferta.margem_percentual.toFixed(0)}% abaixo da FIPE
            </span>
          )}
        </div>

        <div className="linha-fonte-classificacao">
          {rotuloClasse && <span className={`selo-classificacao ${classe}`}>{rotuloClasse}</span>}
          {rotuloFonte && <span className="fonte-via">Via {rotuloFonte}</span>}
        </div>

        <div className="demo-gatilho-corpo">
          <p className="titulo">{titulo}</p>

          <div className="destaque-margem">
            <p className="destaque-margem-valor-rotulo">Ganho</p>
            <p className="destaque-margem-valor">{formatarMoeda(ganho)}</p>
            <p className="destaque-margem-percentual">
              <span className="destaque-margem-percentual-rotulo">Margem de</span>{" "}
              {oferta.margem_percentual?.toFixed(1)}%{" "}
              <span className="destaque-margem-percentual-rotulo">abaixo da FIPE</span>
            </p>
          </div>

          <div className="precos-grupo">
            <div className="linha-preco linha-preco-anuncio">
              <span className="preco-rotulo">Oferta</span>
              <span className="preco-valor">{formatarMoeda(oferta.preco)}</span>
            </div>
            <div className="linha-preco linha-preco-fipe">
              <span className="preco-rotulo">FIPE</span>
              <span>{formatarMoeda(oferta.fipe_valor)}</span>
            </div>
          </div>

          <span className="demo-gatilho-cta">
            <Sparkles size={16} strokeWidth={2.2} /> Abrir experiência completa
            <ArrowRight size={16} strokeWidth={2.4} />
          </span>
        </div>
      </div>

      {aberto && (
        <div className="demo-modal" role="dialog" aria-modal="true" onClick={() => setAberto(false)}>
          <div className="demo-modal-caixa" onClick={(e) => e.stopPropagation()}>
            <header className="demo-modal-topo">
              <span className="demo-modal-titulo">
                <Sparkles size={15} strokeWidth={2.2} /> Você está vendo uma oferta real — completa
              </span>
              <button type="button" className="demo-modal-fechar" onClick={() => setAberto(false)} aria-label="Fechar">
                <X size={18} strokeWidth={2.2} />
              </button>
            </header>

            <div className="demo-modal-palco">
              {carregando && (
                <div className="demo-modal-carregando">
                  <Loader2 size={26} className="animate-spin" />
                  <span>Abrindo o anúncio…</span>
                </div>
              )}
              <iframe
                src={oferta.url}
                title="Oferta de demonstração — Repasse Livre"
                className="demo-modal-iframe"
                onLoad={() => setCarregando(false)}
              />
            </div>

            <footer className="demo-modal-rodape">
              <p>É exatamente isto que o PRO destrava — em cada oferta abaixo da FIPE.</p>
              <button type="button" className="planos-cta" onClick={irParaAssinatura}>
                <Sparkles size={16} strokeWidth={2} /> ENCONTRAR MAIS OPORTUNIDADES
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
