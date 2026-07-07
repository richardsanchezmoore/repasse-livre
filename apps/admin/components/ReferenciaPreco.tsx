"use client";

import { ThumbsUp } from "lucide-react";
import type { ReferenciaPreco as Referencia } from "@/lib/referenciaPreco";

/** Preço em reais SEM centavos — os rótulos do eixo são estreitos (barra ~287px
 *  no desktop 50/50); o ",00" só ocupa espaço e faz os rótulos colidirem. */
function reaisCompacto(valor: number): string {
  return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
}

/**
 * Barra "Preços de referência Repasse Livre" da página individual: posiciona o
 * preço do anúncio na faixa mín/médio/máx das nossas ofertas do mesmo modelo,
 * com a FIPE como marco e um selo ("Ótimo/Bom preço"). Presentational — recebe
 * tudo por props (ver lib/referenciaPreco.ts, server-only).
 * Ver project_repasse_livre_referencia_preco_plataforma.
 */

// Layout de ZONAS FIXAS: a faixa das ofertas (mín→máx) sempre ocupa esta % do
// trilho, independente do spread — evita que preços muito próximos virem um
// sliver com os rótulos amontoados. A FIPE fica num marco fixo à direita (teto).
const LARGURA_FAIXA = 58;
const POS_FIPE = 90;

function selo(fracaoNaFaixa: number): { rotulo: string; classe: string; icone: boolean } {
  // Onde o anúncio cai entre mín (0) e máx (1) das ofertas do modelo.
  if (fracaoNaFaixa <= 0.34) return { rotulo: "Ótimo preço", classe: "otimo", icone: true };
  if (fracaoNaFaixa <= 0.66) return { rotulo: "Bom preço", classe: "bom", icone: true };
  return { rotulo: "Preço de mercado", classe: "neutro", icone: false };
}

export function ReferenciaPreco({
  referencia,
  precoAnuncio,
  fipeValor,
  mesRef,
}: {
  referencia: Referencia;
  precoAnuncio: number;
  fipeValor: number | null;
  mesRef: string | null;
}) {
  const { min, media, max, total, escopo } = referencia;
  // Posição DENTRO da faixa das ofertas (0 = mín, 1 = máx) — proporcional, é o
  // que importa: onde o anúncio cai entre o menor e o maior preço do modelo.
  const fracao = max > min ? (precoAnuncio - min) / (max - min) : 0.5;
  const fracMedia = max > min ? (media - min) / (max - min) : 0.5;

  // A faixa ocupa sempre LARGURA_FAIXA% (zonas fixas), então mín/máx nunca se
  // amontoam mesmo com spread pequeno. A FIPE é o marco fixo à direita.
  const posOferta = fracao * LARGURA_FAIXA;
  const posMedia = fracMedia * LARGURA_FAIXA;
  const posMax = LARGURA_FAIXA;
  const posFipe = fipeValor != null ? POS_FIPE : null;

  // Perto das bordas, o rótulo "Este anúncio" ancora no início/fim pra não vazar
  // do card; no meio fica centrado. A agulha marca sempre a posição exata.
  const ancoraAnuncio = posOferta <= 16 ? "inicio" : posOferta >= 84 ? "fim" : "centro";

  const { rotulo: rotuloSelo, classe: classeSelo, icone: temIcone } = selo(fracao);

  return (
    <section className="referencia-preco">
      <div className="referencia-preco-cabecalho">
        <h2 className="referencia-preco-titulo">Preços de referência</h2>
        <span className={`referencia-preco-selo referencia-preco-selo-${classeSelo}`}>
          {temIcone && <ThumbsUp size={13} strokeWidth={2} className="icone-inline" />} {rotuloSelo}
        </span>
      </div>
      <p className="referencia-preco-subtitulo">
        {total} ofertas semelhantes {escopo} · preço médio {reaisCompacto(media)}
      </p>

      <div className="referencia-preco-grafico">
        {/* Rótulo "Este anúncio" — alinhamento flipa perto das bordas (não vaza) */}
        <div
          className={`referencia-preco-marcador referencia-preco-marcador-${ancoraAnuncio}`}
          style={ancoraAnuncio === "centro" ? { left: `${posOferta}%` } : undefined}
        >
          <span className="referencia-preco-marcador-rotulo">Este anúncio</span>
          <span className="referencia-preco-marcador-valor">{reaisCompacto(precoAnuncio)}</span>
        </div>
        {/* Agulha na posição EXATA do preço do anúncio */}
        <div className="referencia-preco-agulha" style={{ left: `${posOferta}%` }} aria-hidden />

        {/* Trilho: faixa das ofertas (mín→máx) preenchida, resto neutro até a FIPE */}
        <div className="referencia-preco-trilho">
          <div
            className="referencia-preco-faixa"
            style={{ width: `${posMax}%` }}
            aria-hidden
          />
          <div className="referencia-preco-tick-medio" style={{ left: `${posMedia}%` }} aria-hidden />
          {posFipe != null && (
            <div className="referencia-preco-fipe" style={{ left: `${posFipe}%` }}>
              <span className="referencia-preco-fipe-linha" aria-hidden />
              <span className="referencia-preco-fipe-rotulo">FIPE</span>
            </div>
          )}
        </div>

        {/* Rótulos mín / máx nas pontas da faixa das ofertas. O "médio" fica só
            como tick na barra + no subtítulo — três valores não caberiam. */}
        <div className="referencia-preco-legendas">
          <div className="referencia-preco-legenda" style={{ left: "0%" }}>
            <span className="referencia-preco-legenda-rotulo">mín</span>
            <span className="referencia-preco-legenda-valor">{reaisCompacto(min)}</span>
          </div>
          <div className="referencia-preco-legenda referencia-preco-legenda-fim" style={{ left: `${posMax}%` }}>
            <span className="referencia-preco-legenda-rotulo">máx</span>
            <span className="referencia-preco-legenda-valor">{reaisCompacto(max)}</span>
          </div>
        </div>
      </div>

      {mesRef && <p className="referencia-preco-mes">Referência FIPE: {mesRef}</p>}
    </section>
  );
}
