"use client";

import { ThumbsUp } from "lucide-react";
import type { ReferenciaPreco as Referencia } from "@/lib/referenciaPreco";

/** Preço em reais SEM centavos — os rótulos do eixo são estreitos e o ",00" só
 *  ocupa espaço. */
function reaisCompacto(valor: number): string {
  return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
}

/**
 * Barra "Preços de referência" da página individual: posiciona o preço do
 * anúncio na faixa mín→máx das NOSSAS ofertas do mesmo modelo. A faixa ocupa a
 * barra inteira em 3 zonas de cor (verde ótimo → âmbar bom → coral mercado) e o
 * selo sai da zona onde o anúncio cai. A FIPE saiu DE PROPÓSITO — já aparece no
 * bloco Oferta/FIPE e na aba Histórico, então aqui a referência é só "você vs os
 * semelhantes". Presentational (tudo por props; ver lib/referenciaPreco.ts).
 * Ver project_repasse_livre_referencia_preco_plataforma.
 */
function selo(fracao: number): { rotulo: string; classe: string; icone: boolean } {
  // Terços da faixa das ofertas, casando 1:1 com as 3 zonas de cor do trilho.
  if (fracao <= 1 / 3) return { rotulo: "Ótimo preço", classe: "otimo", icone: true };
  if (fracao <= 2 / 3) return { rotulo: "Bom preço", classe: "bom", icone: true };
  return { rotulo: "Margem pequena", classe: "mercado", icone: false };
}

export function ReferenciaPreco({
  referencia,
  precoAnuncio,
}: {
  referencia: Referencia;
  precoAnuncio: number;
}) {
  const { min, media, max, total, escopo } = referencia;
  // Posição do anúncio na faixa das ofertas (0 = mín, 1 = máx).
  const fracao = max > min ? (precoAnuncio - min) / (max - min) : 0.5;
  const pos = Math.max(3, Math.min(97, fracao * 100)); // não cola nas bordas

  // Perto das pontas, o balão ancora no início/fim pra não vazar do card.
  const ancora = pos <= 18 ? "inicio" : pos >= 82 ? "fim" : "centro";
  const { rotulo: rotuloSelo, classe: classeSelo, icone: temIcone } = selo(fracao);

  return (
    <section className="referencia-preco">
      {/* Sem título próprio — a aba "Preços Referência" já nomeia o painel. */}
      <p className="referencia-preco-subtitulo">
        <strong className="referencia-preco-subtitulo-forte">{total} ofertas</strong> semelhantes{" "}
        {escopo} · preço médio {reaisCompacto(media)}
      </p>

      <div className="referencia-preco-grafico">
        {/* Balão do preço anunciado + selo, ancorado à posição na faixa. */}
        <div
          className={`referencia-preco-marcador referencia-preco-marcador-${ancora}`}
          style={ancora === "centro" ? { left: `${pos}%` } : undefined}
        >
          <span className="referencia-preco-marcador-rotulo">Preço anunciado</span>
          <span className="referencia-preco-marcador-valor">{reaisCompacto(precoAnuncio)}</span>
          <span className={`referencia-preco-selo referencia-preco-selo-${classeSelo}`}>
            {temIcone && <ThumbsUp size={12} strokeWidth={2.5} className="icone-inline" />} {rotuloSelo}
          </span>
        </div>
        {/* Linha pontilhada do balão até a barra. */}
        <div className="referencia-preco-agulha" style={{ left: `${pos}%` }} aria-hidden />

        {/* Trilho tricolor: verde (ótimo) → âmbar (bom) → coral (mercado). */}
        <div className="referencia-preco-trilho" aria-hidden>
          <span className="referencia-preco-zona referencia-preco-zona-otimo" />
          <span className="referencia-preco-zona referencia-preco-zona-bom" />
          <span className="referencia-preco-zona referencia-preco-zona-mercado" />
        </div>
        {/* Ponto do anúncio na posição exata. */}
        <div className="referencia-preco-ponto" style={{ left: `${pos}%` }} aria-hidden />

        {/* Rótulos mín / médio / máx nas pontas e no centro. */}
        <div className="referencia-preco-legendas">
          <div className="referencia-preco-legenda referencia-preco-legenda-inicio">
            <span className="referencia-preco-legenda-valor">{reaisCompacto(min)}</span>
            <span className="referencia-preco-legenda-rotulo">preço mínimo</span>
          </div>
          <div className="referencia-preco-legenda referencia-preco-legenda-centro">
            <span className="referencia-preco-legenda-valor">{reaisCompacto(media)}</span>
            <span className="referencia-preco-legenda-rotulo">preço médio</span>
          </div>
          <div className="referencia-preco-legenda referencia-preco-legenda-fim">
            <span className="referencia-preco-legenda-valor">{reaisCompacto(max)}</span>
            <span className="referencia-preco-legenda-rotulo">preço máximo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
