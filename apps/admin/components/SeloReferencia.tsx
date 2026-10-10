"use client";

import { useTextos } from "@/lib/useIdioma";

/**
 * O SELO DA TABELA — o que substitui "Margem de X% abaixo da FIPE".
 *
 * ★★★ Desenho do Gustavo: *"até mesmo para posteriormente nós adicionarmos o
 * selo — '3% por debajo de la tabla AutoRadarPY'"*. É o produto aparecendo na
 * tela: no Paraguai não existe FIPE, então a referência contra a qual o preço
 * é medido é a NOSSA, construída das observações de preço.
 *
 * ★★ O que o selo diz e o que ele NÃO diz: ele afirma POSIÇÃO ("3% abaixo da
 * referência"), nunca veredito ("bom negócio"). Sem FIPE não há autoridade
 * externa para chamar algo de desconto — e a frase honesta é a que sustenta a
 * marca.
 *
 * ⚠️ O ESCOPO FICA, O n NÃO. Decisão dele: *"mostrar ofertas (11 ofertas)
 * enfraquece... não devemos mostrar"*, mas *"o rótulo de escopo pode ficar"*.
 * Saber CONTRA O QUE se compara é metade da credibilidade; saber que foram 11
 * ofertas só convida a duvidar.
 *
 * ⚠️⚠️ "no miolo" não é fracasso. A maior parte dos anúncios está no preço do
 * mercado, e dizer isso é exatamente o serviço — quem olha um carro quer saber
 * se está pagando caro, e "está na faixa" responde.
 */
export function SeloReferencia({
  percentual,
  faixa,
  escopo,
}: {
  percentual: number;
  faixa: "abaixo" | "no_miolo" | "acima";
  escopo: string;
}) {
  const tx = useTextos();
  // ⚠️ Uma casa decimal, nunca duas: a mediana se move com cada anúncio novo, e
  // "3,47%" promete uma estabilidade que o número não tem.
  const n = Math.abs(percentual).toFixed(1).replace(".", ",");

  const texto =
    faixa === "abaixo"
      ? `${n}% ${tx("abaixoDaTabela")}`
      : faixa === "acima"
        ? `${n}% ${tx("acimaDaTabela")}`
        : tx("noPrecoDeMercado");

  return (
    <div className={`selo-referencia selo-referencia-${faixa}`}>
      <span className="selo-referencia-texto">{texto}</span>
      {/* O escopo em letra miúda: "referência 2012", "referência 2005–2010". */}
      <span className="selo-referencia-escopo">{escopo}</span>
    </div>
  );
}
