"use client";

import { useEffect, useState } from "react";
import {
  formatarNaMoeda,
  normalizarMoeda,
  formatarLeitura,
  lerMoedaEscolhida,
  parDaMoeda,
  EVENTO_MOEDA,
  dataDaCotacao,
  type CodigoMoeda,
  type Cotacao,
} from "@/lib/moeda";
import { useIdioma, useTextos } from "@/lib/useIdioma";
import { BandeiraDaMoeda } from "@/components/Bandeira";

/**
 * PREÇO DO ANÚNCIO — o fato em destaque, as leituras embaixo, cada uma rotulada.
 *
 * ★★ DESENHO ATUAL (Gustavo, 10/10/2026): *"precisamos deixar claro o valor em
 * destaque é devido à moeda do anúncio: Ex: Moeda Anunciada: / Em Dólar-Guarani:"*
 * e *"serão duas moedas sempre expostas e duas no 'Escolher Moeda'"*.
 *
 * Então a tela é:
 *
 *     Moneda del anuncio
 *     ₲ 82.000.000          ← grande, é o que o vendedor pediu
 *     En Dólar  ≈ US$ 11.000 · cambio 10/10
 *     En Real   ≈ R$ 59.000  ← só se escolher na caixinha
 *
 * ★★ POR QUE O RÓTULO IMPORTA: sem ele, "₲ 82.000.000" e "US$ 11.000" na mesma
 * caixa parecem dois preços — e num mercado onde o MESMO carro é anunciado em
 * guarani por um e em dólar por outro, o leitor não tem como saber qual é o
 * pedido do vendedor e qual é conta nossa. O rótulo é o que separa fato de
 * leitura.
 *
 * ★ O par guarani/dólar não é escolha: no Paraguai o anúncio só sai nessas duas
 * moedas. A moeda do anúncio é uma, a leitura é a outra — `parDaMoeda`. Real e
 * peso são de VISITANTE e ficam na caixinha, opcionais (ver `SeletorMoeda`).
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
  const tx = useTextos();
  const idioma = useIdioma();
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  // ⚠️ Começa sem moeda extra e só lê a escolha DEPOIS de montar: no servidor
  // não existe localStorage, e ler ali daria divergência de hidratação.
  const [extra, setExtra] = useState<CodigoMoeda | null>(null);

  useEffect(() => {
    setExtra(lerMoedaEscolhida());
    // ★ O evento é o que faz os cards JÁ RENDERIZADOS acompanharem a troca.
    // Sem ele o usuário escolheria a moeda e nada mudaria até recarregar.
    const ouvir = (e: Event) => setExtra(((e as CustomEvent).detail as CodigoMoeda | null) ?? null);
    window.addEventListener(EVENTO_MOEDA, ouvir);
    return () => window.removeEventListener(EVENTO_MOEDA, ouvir);
  }, []);

  // A leitura fixa é sempre a outra metade do par da praça.
  const par = parDaMoeda(moeda);
  const precisaCotacao = valor != null;

  /**
   * ★★★ O REAL APARECE SOZINHO PARA QUEM LÊ EM PORTUGUÊS — Gustavo, 16/10/2026:
   *
   * > *"também mostrarmos o real, pois vamos atrair um bom público brasileiro;
   * > se eles baterem o olho e verem o real... temos mais de 300 mil
   * > brasileiros aqui"*
   *
   * ⚠️ Mas NÃO para todo mundo: três moedas em cada cartão é ruído para o
   * paraguaio, que compra em guarani ou dólar e nunca em real. Amarrar ao
   * IDIOMA resolve os dois lados — quem chega pelo /pt vê o real sem precisar
   * descobrir a caixinha, e a raiz em espanhol continua com o par da praça.
   *
   * ⚠️ A escolha explícita na caixinha continua mandando: se ele escolheu peso
   * argentino, é peso que aparece, mesmo em português.
   */
  const extraEfetiva: CodigoMoeda | null =
    extra ?? (idioma === "pt" && par !== "BRL" ? "BRL" : null);
  useEffect(() => {
    if (!precisaCotacao) return;
    let vivo = true;
    obterCotacao().then((c) => { if (vivo) setCotacao(c); });
    return () => { vivo = false; };
  }, [precisaCotacao]);

  const leituraPar = formatarLeitura(valor, moeda, cotacao, par);
  const leituraExtra = extraEfetiva ? formatarLeitura(valor, moeda, cotacao, extraEfetiva) : null;
  const quando = dataDaCotacao(cotacao);
  const nome = (c: CodigoMoeda) => NOME_CURTO[c];

  return (
    <span className={className}>
      <span className="preco-moeda-rotulo">{tx("moedaAnunciada")}</span>
      {/* ★★ A BANDEIRA ENTRA AQUI, colada no valor grande. É a moeda DO
          ANÚNCIO — o fato — e é a que o olho precisa distinguir de relance
          numa listagem onde um vendedor pediu em guarani e o outro em dólar. */}
      <span className="preco-origem">
        <BandeiraDaMoeda codigo={normalizarMoeda(moeda)} tamanho={18} />
        {formatarNaMoeda(valor, moeda)}
      </span>
      {leituraPar && (
        <span className="preco-leitura" title={quando ? `${tx("cambioDe")} ${quando} — ${tx("cambioAviso")}` : undefined}>
          <span className="preco-leitura-rotulo"><BandeiraDaMoeda codigo={par} tamanho={14} /> {tx("em")} {nome(par)}</span>
          {leituraPar}
          {quando ? <span className="preco-leitura-data"> · {tx("cambioDe")} {quando}</span> : null}
        </span>
      )}
      {leituraExtra && extraEfetiva && (
        <span className="preco-leitura preco-leitura-extra">
          <span className="preco-leitura-rotulo"><BandeiraDaMoeda codigo={extraEfetiva} tamanho={14} /> {tx("em")} {nome(extraEfetiva)}</span>
          {leituraExtra}
        </span>
      )}
    </span>
  );
}

/**
 * ⚠️ Nome curto e NEUTRO de propósito. "Guaraní"/"Dólar"/"Real"/"Peso" leem
 * igual nos dois idiomas — traduzir nome de moeda renderia "Dolar" vs "Dólar" e
 * zero ganho.
 */
const NOME_CURTO: Record<CodigoMoeda, string> = {
  PYG: "Guaraní",
  USD: "Dólar",
  BRL: "Real",
  ARS: "Peso",
};
