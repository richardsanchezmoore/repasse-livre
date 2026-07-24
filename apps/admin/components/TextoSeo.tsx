import React from "react";

/**
 * Parágrafo de SEO sob o H1 das páginas de categoria. Renderiza "FIPE" em NEGRITO
 * — junto de "tabela" quando aparece ("tabela FIPE"); "abaixo da FIPE" fica só
 * "FIPE" em negrito (a preposição/artigo não entra). Fica FORA do .board-header
 * (é bloco próprio abaixo do título, largura cheia).
 */
export function TextoSeo({ texto }: { texto: string }) {
  return <p className="board-seo-texto">{realcarFipe(texto)}</p>;
}

function realcarFipe(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  const regex = /(\btabela\s+)?\bFIPE\b/gi;
  let ultimo = 0;
  let chave = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    partes.push(<strong key={chave++}>{m[0]}</strong>);
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}
