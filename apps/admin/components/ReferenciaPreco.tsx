"use client";

import { ThumbsUp } from "lucide-react";
import { formatarMoeda } from "@/lib/formatadores";
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

function porcentagem(valor: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(100, ((valor - lo) / (hi - lo)) * 100));
}

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
  const { min, media, max, total } = referencia;
  // Domínio da barra: do menor preço até o maior entre (máx das ofertas, FIPE).
  // Como as ofertas ficam ABAIXO da FIPE, a FIPE normalmente ancora a direita.
  const lo = min;
  const hi = Math.max(max, fipeValor ?? max);

  const posOferta = porcentagem(precoAnuncio, lo, hi);
  const posMedia = porcentagem(media, lo, hi);
  const posMax = porcentagem(max, lo, hi);
  const posFipe = fipeValor != null ? porcentagem(fipeValor, lo, hi) : null;

  const fracao = max > min ? (precoAnuncio - min) / (max - min) : 0;
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
        {total} ofertas semelhantes · preço médio {reaisCompacto(media)}
      </p>

      <div className="referencia-preco-grafico">
        {/* Marcador do anúncio (acima da barra) */}
        <div className="referencia-preco-marcador" style={{ left: `${posOferta}%` }}>
          <span className="referencia-preco-marcador-rotulo">Este anúncio</span>
          <span className="referencia-preco-marcador-valor">{formatarMoeda(precoAnuncio)}</span>
          <span className="referencia-preco-marcador-agulha" aria-hidden />
        </div>

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
