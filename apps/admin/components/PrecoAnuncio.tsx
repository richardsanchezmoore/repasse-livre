"use client";

import { useEffect, useState } from "react";
import {
  formatarNaMoeda,
  formatarLeituraEmReal,
  dataDaCotacao,
  normalizarMoeda,
  type Cotacao,
} from "@/lib/moeda";

/**
 * PREÇO DO ANÚNCIO — na moeda de origem, com a leitura em real embaixo.
 *
 * ★★ O FATO E A LEITURA, separados na tela (desenho do Gustavo, 23/09/2026):
 * no Paraguai o anúncio sai em guarani ou dólar, nunca em real. Então a linha
 * grande é a moeda em que o vendedor pediu — o fato — e o real aparece menor,
 * com "≈" e a data, porque é conversão do dia, não promessa.
 *
 * ⚠️ O "≈" e o arredondamento para unidade não são descuido. O spread entre
 * compra e venda do guarani passou de 6% no teste de setembro, e a casa de
 * câmbio de Ciudad del Este não pratica a taxa de mercado. Centavo numa
 * conversão dessas sugere precisão que não existe.
 *
 * ★ O bug que isto conserta estava NO AR: `formatarMoeda` chumba BRL, então um
 * carro de ₲220.000.000 aparecia como "R$ 220.000.000". Não é arredondamento —
 * são duas ordens de grandeza, e o número certo é R$ 195 mil.
 */

/**
 * ⚠️ UMA BUSCA POR CARREGAMENTO, não uma por card. A promessa fica no módulo,
 * então vinte cards na mesma página dividem a mesma chamada. Sem isto, uma
 * listagem de 40 anúncios dispararia 40 requisições iguais — e foi exatamente
 * esse tipo de desperdício que estourou o egress do Supabase em 02/10.
 */
let promessaCotacao: Promise<Cotacao | null> | null = null;
function obterCotacao(): Promise<Cotacao | null> {
  if (!promessaCotacao) {
    promessaCotacao = fetch("/api/cotacao")
      .then((r) => (r.ok ? (r.json() as Promise<Cotacao>) : null))
      .catch(() => null);
  }
  return promessaCotacao;
}

export function PrecoAnuncio({
  valor,
  moeda,
  className,
}: {
  valor: number | null | undefined;
  moeda?: string | null;
  className?: string;
}) {
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);

  // Só busca quando há o que converter: anúncio em real não precisa de taxa.
  const precisaConverter = normalizarMoeda(moeda) !== "BRL" && valor != null;

  useEffect(() => {
    if (!precisaConverter) return;
    let vivo = true;
    obterCotacao().then((c) => { if (vivo) setCotacao(c); });
    return () => { vivo = false; };
  }, [precisaConverter]);

  const leitura = formatarLeituraEmReal(valor, moeda, cotacao);
  const quando = dataDaCotacao(cotacao);

  return (
    <span className={className}>
      <span className="preco-origem">{formatarNaMoeda(valor, moeda)}</span>
      {leitura && (
        <span className="preco-leitura-real" title={quando ? `Câmbio de ${quando} — referência, não cotação de casa de câmbio` : undefined}>
          {leitura}
          {quando ? <span className="preco-leitura-data"> · câmbio {quando}</span> : null}
        </span>
      )}
    </span>
  );
}
