"use client";

import Link from "next/link";
import { useTextos } from "@/lib/useIdioma";
import { SeletorIdioma } from "@/components/SeletorIdioma";

/**
 * O topo da página da tabela — título, o mês de referência e a explicação.
 *
 * ★★ A EXPLICAÇÃO NÃO É LETRA MIÚDA DEFENSIVA, é a diferença entre nós e o
 * Carden: ele publica a "média" de UM anúncio sem dizer de onde veio. Dizer que
 * a referência é a mediana dos anúncios semelhantes DESTE MÊS, e que não é
 * avaliação do carro de ninguém, é o que torna o número confiável — e é o que
 * sustenta o selo *"3% por debajo de la tabla"*.
 *
 * ★ O MÊS fica visível pelo mesmo motivo que a FIPE estampa o mês: referência
 * sem data é referência que ninguém sabe se ainda vale.
 */
export function CabecalhoTabela({ mes, vazia }: { mes: string; vazia: boolean }) {
  const tx = useTextos();

  // "2026-10-01" → "10/2026". ⚠️ Sem `new Date()`: a string já é o que importa,
  // e passar por Date aqui traria o fuso de volta ao problema.
  const [ano, m] = mes.split("-");
  const quando = m && ano ? `${m}/${ano}` : mes;

  return (
    <header className="tabela-topo">
      <div className="tabela-topo-barra">
        <Link href="/" className="tabela-topo-voltar">← {tx("voltar")}</Link>
        <SeletorIdioma />
      </div>

      <h1 className="tabela-topo-titulo">{tx("tabelaTitulo")}</h1>
      <p className="tabela-topo-sub">{tx("tabelaSub")}</p>
      <p className="tabela-topo-mes">{tx("referenciaMes")} {quando}</p>

      {vazia ? (
        <p className="tabela-topo-vazia">{tx("tabelaVazia")}</p>
      ) : (
        <details className="tabela-como">
          <summary>{tx("tabelaComoFunciona")}</summary>
          <p>{tx("tabelaExplicacao")}</p>
        </details>
      )}
    </header>
  );
}
