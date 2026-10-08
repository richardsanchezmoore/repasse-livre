/**
 * GERAÇÕES — o dicionário que separa dois carros com o mesmo nome.
 *
 * ★★★ POR QUE ISTO EXISTE, e por que é mais do que enfeite de catálogo.
 *
 * Gustavo, 08/10/2026: *"o dicionário de modelos deve seguir o que a internet
 * nos informa de modelos existentes conforme ano etc., não somente o que
 * conseguimos nas buscas... é exatamente para BASILAR e CORRIGIR os achados que
 * precisamos do nosso dicionário"*.
 *
 * ⚠️ O ponto é esse: faixa de ano sozinha ([[anoModeloPY]]) só diz se o ano é
 * plausível. Geração diz **qual carro é**. Um Crown 2002 é S170 e um Crown 2005
 * é S180 — motor, carroceria e preço diferentes, mesmo nome no anúncio. A
 * referência de preço por modelo+ano mistura os dois sempre que a amostra de um
 * ano é pequena, e no Paraguai ela é quase sempre pequena.
 *
 * ★ O GANHO PRÁTICO: quando um ano tem n insuficiente para publicar mediana
 * (hoje o piso é 3 ofertas distintas), a GERAÇÃO agrupa anos vizinhos que são
 * de fato o mesmo carro. É mais honesto que alargar a janela por anos
 * arbitrários — "Crown S180" é um agrupamento que existe na engenharia, não uma
 * conveniência estatística nossa. Ver [[referenciaPrecoPY]].
 *
 * ═══ A REGRA DE PROCEDÊNCIA ═══
 *
 * ⚠️ `confianca: "firme"` SÓ para o que foi conferido em fonte nesta pesquisa, e
 * a fonte fica anotada. Onde as fontes divergiram, o campo é `estimado` e a nota
 * diz ONDE divergiram — porque "2008 ou 2007?" num anúncio de fronteira é
 * exatamente o caso que a tabela precisa arbitrar, e fingir precisão ali seria
 * pior que admitir a dúvida.
 *
 * ⚠️⚠️ E vale a mesma regra de ouro do ano: isto SINALIZA, não REJEITA. O carro
 * entra por Iquique anos depois de fabricado e o vendedor às vezes escreve o ano
 * de importação. Geração fora da faixa vira aviso, nunca descarte.
 *
 * Fontes desta rodada: en.wikipedia.org/wiki/Toyota_Aqua · /Toyota_HiAce ·
 * /Toyota_Noah · /Toyota_Alphard · jdmbuysell.com/learn/toyota/crown/ (S170,
 * S180, S200) · autocade.net (Noah R70).
 */

export interface Geracao {
  /** Código de chassi como o mercado JDM usa: NHP10, H200, S180, AH20. */
  codigo: string;
  de: number;
  /** null = ainda em linha. */
  ate: number | null;
  confianca: "firme" | "estimado";
  nota?: string;
}

/** Chave = nome canônico do catálogo (catalogoJdmParaguai.ts). */
export const GERACOES: Record<string, Geracao[]> = {
  // ── Toyota: híbrido compacto ────────────────────────────────────────────
  aqua: [
    // ⚠️ NÃO é XP10: esse código é do Echo de 1999, carro diferente. Errar isso
    // colocaria um Echo 2000 dentro da faixa de um híbrido 2012.
    { codigo: "NHP10", de: 2011, ate: 2021, confianca: "firme", nota: "fora do Japão virou Prius c; facelifts em 2014 e 2017" },
    { codigo: "XP210", de: 2021, ate: null, confianca: "firme" },
  ],

  // ── Toyota: vans ────────────────────────────────────────────────────────
  hiace: [
    { codigo: "H100", de: 1989, ate: 2004, confianca: "firme", nota: "a Hiace global clássica — é a que mais deve aparecer usada aqui" },
    {
      codigo: "H200",
      de: 2004,
      ate: 2019,
      confianca: "estimado",
      nota: "⚠️ fontes divergem: um guia diz 2004–2018, outro mantém em linha no Japão. O fim varia POR MERCADO.",
    },
    { codigo: "H300", de: 2019, ate: null, confianca: "firme" },
  ],
  alphard: [
    { codigo: "AH10", de: 2002, ate: 2008, confianca: "estimado", nota: "⚠️ fontes divergem entre 2007 e 2008 para o fim" },
    { codigo: "AH20", de: 2008, ate: 2015, confianca: "estimado", nota: "⚠️ uma fonte encerra em 2014, outra começa o AH30 em 2015" },
    { codigo: "AH30", de: 2015, ate: 2023, confianca: "firme", nota: "a grade em escudo começa aqui" },
    { codigo: "AH40", de: 2023, ate: null, confianca: "firme" },
  ],
  vellfire: [
    // Gêmeo do Alphard desde 2008 — nasce junto e troca de geração junto.
    { codigo: "AH20", de: 2008, ate: 2015, confianca: "estimado", nota: "gêmeo do Alphard; mesmas datas, mesma divergência" },
    { codigo: "AH30", de: 2015, ate: 2023, confianca: "estimado" },
    { codigo: "AH40", de: 2023, ate: null, confianca: "estimado" },
  ],

  // ── Toyota: minivans ────────────────────────────────────────────────────
  noah: [
    { codigo: "R60", de: 2001, ate: 2007, confianca: "firme", nota: "produção nov/2001 – jun/2007" },
    { codigo: "R70", de: 2007, ate: 2014, confianca: "firme" },
    { codigo: "R80", de: 2014, ate: 2021, confianca: "estimado", nota: "⚠️ fonte única (catálogo russo); facelift por volta de 2017" },
    { codigo: "R90", de: 2022, ate: null, confianca: "estimado", nota: "⚠️ fonte única; primeira geração em plataforma TNGA" },
  ],
  wish: [
    // ⚠️ A pesquisa confirmou o INTERVALO TOTAL (2003–2017) e a existência de
    // duas gerações (AE10/AE20), mas NÃO as datas de corte. Deixo as duas
    // entradas com o corte provável marcado como estimado em vez de omitir —
    // omitir faria a referência tratar 14 anos como um carro só.
    { codigo: "AE10", de: 2003, ate: 2009, confianca: "estimado", nota: "⚠️ corte NÃO confirmado em fonte; só o intervalo total (2003–2017) está" },
    { codigo: "AE20", de: 2009, ate: 2017, confianca: "estimado", nota: "⚠️ corte NÃO confirmado em fonte" },
  ],

  // ══════════════════════════════════════════════════════════════════════
  // ★★ OS QUE DOMINAM A BASE — adicionados em 08/10/2026.
  //
  // ⚠️ ERRO MEU, e vale registrar: a primeira versão deste arquivo cobriu os
  // modelos que a sonda tinha acabado de descobrir que FALTAVAM (hiace, aqua,
  // crown…) e nenhum dos que a base já tem aos montes. Resultado medido: ZERO
  // dos 307 anúncios caía numa geração conhecida. Dicionário tem que cobrir
  // primeiro o que já está na mão.
  // ══════════════════════════════════════════════════════════════════════

  // 32 anúncios na base, anos 2000–2015 — o carro mais comum da praça.
  vitz: [
    { codigo: "XP10", de: 1999, ate: 2005, confianca: "firme" },
    { codigo: "XP90", de: 2005, ate: 2010, confianca: "estimado", nota: "⚠️ fontes divergem entre 2010 e 2011 para o fim" },
    { codigo: "XP130", de: 2010, ate: 2019, confianca: "estimado", nota: "⚠️ fontes divergem: 2010 ou 2012 para o início; a linha Vitz acaba em 2019 e vira Yaris" },
  ],
  ractis: [
    { codigo: "XP100", de: 2005, ate: 2010, confianca: "firme", nota: "sucessor do Yaris Verso (FunCargo)" },
    { codigo: "XP120", de: 2010, ate: 2016, confianca: "estimado", nota: "⚠️ jan/2010–jun/2016 numa fonte; a Wikipédia leva a linha até dez/2017" },
  ],
  // ★ Premio e Allion são o MESMO carro com grades diferentes — mesmas gerações,
  // e por isso as duas entradas são idênticas de propósito, não copiadas por
  // descuido. Os dois encerram a linhagem do Corona em 2021.
  premio: [
    { codigo: "T240", de: 2001, ate: 2007, confianca: "firme", nota: "produção dez/2001 – jun/2007" },
    { codigo: "T260", de: 2007, ate: 2021, confianca: "firme" },
  ],
  allion: [
    { codigo: "T240", de: 2001, ate: 2007, confianca: "firme" },
    { codigo: "T260", de: 2007, ate: 2021, confianca: "firme" },
  ],

  // ── Toyota: os de conhecimento geral, ainda a conferir em fonte ──────────
  // ⚠️ Todos `estimado`: não passaram pela pesquisa desta rodada. Estão aqui
  // porque uma geração aproximada agrupa melhor que ano nenhum — mas quem
  // publicar número em cima deles precisa saber que a borda pode andar um ano.
  auris: [
    { codigo: "E150", de: 2006, ate: 2012, confianca: "estimado" },
    { codigo: "E180", de: 2012, ate: 2018, confianca: "estimado" },
  ],
  "corolla runx": [{ codigo: "E120", de: 2001, ate: 2006, confianca: "estimado", nota: "geração única" }],
  ist: [
    { codigo: "XP60", de: 2002, ate: 2007, confianca: "estimado" },
    { codigo: "XP110", de: 2007, ate: 2016, confianca: "estimado" },
  ],
  "corolla axio": [
    { codigo: "E140", de: 2006, ate: 2012, confianca: "estimado" },
    { codigo: "E160", de: 2012, ate: 2021, confianca: "estimado" },
  ],
  funcargo: [{ codigo: "XP20", de: 1999, ate: 2005, confianca: "estimado", nota: "vira Ractis em 2005" }],
  platz: [{ codigo: "XP10", de: 1999, ate: 2005, confianca: "estimado", nota: "sedã do Vitz XP10" }],

  // ── Toyota: sedã de luxo ────────────────────────────────────────────────
  // ★ "Crown Athlete" é ACABAMENTO do Crown, não modelo à parte — mesmas
  // gerações. Fica com entrada própria porque é assim que o anúncio paraguaio
  // escreve, e são 15 na base contra zero de "crown" puro.
  "crown athlete": [
    { codigo: "S170", de: 1999, ate: 2003, confianca: "firme" },
    { codigo: "S180", de: 2003, ate: 2008, confianca: "firme" },
    { codigo: "S200", de: 2008, ate: 2012, confianca: "firme" },
    { codigo: "S210", de: 2012, ate: 2018, confianca: "firme" },
  ],
  crown: [
    { codigo: "S170", de: 1999, ate: 2003, confianca: "firme", nota: "a geração mais exportada; motores 2.0, 2.5 e 3.0 seis-em-linha" },
    { codigo: "S180", de: 2003, ate: 2008, confianca: "firme" },
    { codigo: "S200", de: 2008, ate: 2012, confianca: "firme", nota: "entra o híbrido 3.5 (2GR-FSE) e o V8 4.6" },
    { codigo: "S210", de: 2012, ate: 2018, confianca: "firme", nota: "mesmo chassi do S200, mais refresco que geração nova" },
  ],
};

/** Em qual geração este ano cai. null = modelo sem dicionário, ou ano fora de tudo. */
export function geracaoDoAno(modeloCanonico: string | null | undefined, ano: number | null | undefined): Geracao | null {
  if (!modeloCanonico || !ano) return null;
  const lista = GERACOES[modeloCanonico.toLowerCase().trim()];
  if (!lista) return null;
  // ⚠️ As bordas se tocam (S170 acaba em 2003 e S180 começa em 2003): a
  // primeira que serve vence, e é a MAIS VELHA. É o chute certo para carro
  // usado, porque o ano de borda costuma ser o fim da produção da antiga, não
  // o começo da nova — e porque errar para o lado do carro mais antigo
  // subestima o preço em vez de inflá-lo.
  return lista.find((g) => ano >= g.de && (g.ate === null || ano <= g.ate)) ?? null;
}

/**
 * A CHAVE DE AGRUPAMENTO da referência de preço.
 *
 * ★ Devolve "crown S180" quando sabemos a geração, e "crown 2005" quando não
 * sabemos. ⚠️ Nunca mistura os dois formatos para o mesmo modelo numa mesma
 * tabela sem avisar — seria somar maçã com laranja e chamar de mediana.
 */
export function chaveDeReferencia(modeloCanonico: string | null | undefined, ano: number | null | undefined): string | null {
  if (!modeloCanonico) return null;
  const g = geracaoDoAno(modeloCanonico, ano);
  if (g) return `${modeloCanonico.toLowerCase().trim()} ${g.codigo}`;
  return ano ? `${modeloCanonico.toLowerCase().trim()} ${ano}` : null;
}

/** Cobertura: quantos modelos têm gerações, e quantas delas são firmes. */
export function coberturaGeracoes(): { modelos: number; geracoes: number; firmes: number } {
  const todas = Object.values(GERACOES).flat();
  return {
    modelos: Object.keys(GERACOES).length,
    geracoes: todas.length,
    firmes: todas.filter((g) => g.confianca === "firme").length,
  };
}
