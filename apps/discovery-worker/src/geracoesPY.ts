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
  "runx": [{ codigo: "E120", de: 2001, ate: 2006, confianca: "estimado", nota: "geração única" }],
  ist: [
    { codigo: "XP60", de: 2002, ate: 2007, confianca: "estimado" },
    { codigo: "XP110", de: 2007, ate: 2016, confianca: "estimado" },
  ],
  "axio": [
    { codigo: "E140", de: 2006, ate: 2012, confianca: "estimado" },
    { codigo: "E160", de: 2012, ate: 2021, confianca: "estimado" },
  ],
  funcargo: [{ codigo: "XP20", de: 1999, ate: 2005, confianca: "estimado", nota: "vira Ractis em 2005" }],
  platz: [{ codigo: "XP10", de: 1999, ate: 2005, confianca: "estimado", nota: "sedã do Vitz XP10" }],

  // ══════════════════════════════════════════════════════════════════════
  // NÃO-JDM QUE CIRCULAM NA PRAÇA — coreanos e o Fortuner (08/10/2026).
  //
  // ⚠️ O catálogo é JDM por tese, mas a BASE não é só JDM: 88 anúncios (29%)
  // estão em modelos sem geração, e os coreanos lideram. Estes quatro foram
  // pesquisados; Gol, Camaro, Mustang, RAM e C300 ficam de fora por enquanto —
  // não quero enchê-lo de palpite para subir um número de cobertura.
  // ══════════════════════════════════════════════════════════════════════
  sportage: [
    { codigo: "JE/KM", de: 2004, ate: 2010, confianca: "estimado" },
    { codigo: "SL", de: 2010, ate: 2016, confianca: "firme", nota: "o redesenho de Peter Schreyer" },
    { codigo: "QL", de: 2016, ate: 2021, confianca: "estimado", nota: "⚠️ fontes divergem entre 2021 e 2022; varia por mercado" },
    { codigo: "NQ5", de: 2021, ate: null, confianca: "firme" },
  ],
  // ⚠️ O Rio é o caso em que as fontes MAIS divergem: a Wikipédia conta 4
  // gerações (1999–2023), a Carvana conta 3 a partir de 2009, e um banco de
  // dados conta 11 porque separa facelift. Fico com o corte da Wikipédia e
  // marco tudo estimado — publicar mediana por geração de Rio exige cuidado.
  rio: [
    { codigo: "JB", de: 2005, ate: 2011, confianca: "estimado", nota: "⚠️ fontes divergem muito na contagem de gerações do Rio" },
    { codigo: "UB", de: 2011, ate: 2017, confianca: "estimado" },
    { codigo: "YB", de: 2017, ate: 2023, confianca: "estimado" },
  ],
  // Morning é o nome coreano do Picanto — e é assim que o anúncio paraguaio
  // escreve, porque o carro vem da Coreia, não da Europa.
  morning: [
    { codigo: "SA", de: 2003, ate: 2011, confianca: "firme", nota: "produção set/2003 – 2011" },
    { codigo: "TA", de: 2011, ate: 2017, confianca: "estimado" },
    { codigo: "JA", de: 2017, ate: null, confianca: "estimado" },
  ],
  fortuner: [
    { codigo: "AN50/AN60", de: 2004, ate: 2015, confianca: "firme" },
    { codigo: "AN150/AN160", de: 2015, ate: null, confianca: "firme", nota: "fontes russas separam um facelift a partir de 2020, mesmo código" },
  ],

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

  // ══════════════════════════════════════════════════════════════════════
  // LOTE 2 — PICAPE, SUV E VAN QUE PASSARAM A DOMINAR A BASE (12/10/2026)
  //
  // ★★ POR QUE AGORA: a base quadruplicou desde que este arquivo nasceu, e a
  // medição mudou de figura. Hoje há 2.235 anúncios presos num ano com menos
  // de 5 ofertas — ou seja, SEM mediana publicável — dentro de modelos que
  // este dicionário não cobre. O topo da lista não é mais JDM: é Prado,
  // Amarok, Grand Carnival, Navara, Captiva, Swift.
  //
  // ⚠️ Mesma regra de procedência de sempre: `firme` só onde a fonte fecha,
  // `estimado` onde as fontes divergiram, e a divergência fica escrita. Isto
  // aqui decide em que grupo um carro entra para formar mediana — precisão
  // fingida sai mais cara que dúvida declarada.
  //
  // Fontes deste lote: en.wikipedia.org (Toyota_Land_Cruiser_Prado,
  // Volkswagen_Amarok, Kia_Carnival, Nissan_Navara, Chevrolet_Captiva) ·
  // jdmbuysell.com/learn/toyota/land-cruiser-prado/ · autocade.net
  // (Suzuki_Swift_(ZC1)) · cars-data.com/en/suzuki/swift
  // ══════════════════════════════════════════════════════════════════════

  // ⚠️⚠️ PRADO É LINHAGEM, NÃO A FAMÍLIA — ver catalogoJdmParaguai. As cinco
  // gerações abaixo são do Prado; a família "land cruiser" tem lista própria,
  // logo abaixo, e só recebe o anúncio que NÃO disse qual é.
  "land cruiser prado": [
    { codigo: "J70", de: 1990, ate: 1996, confianca: "estimado", nota: "⚠️ a origem do modelo é de 1984; o emblema Prado só aparece em 1990, e há fonte que nem conta esta como geração do Prado" },
    { codigo: "J90", de: 1996, ate: 2002, confianca: "firme", nota: "1ª sobre plataforma própria do Prado, molas helicoidais nos dois eixos" },
    { codigo: "J120", de: 2002, ate: 2009, confianca: "firme", nota: "é o Lexus GX470 na América do Norte" },
    { codigo: "J150", de: 2009, ate: 2023, confianca: "firme", nota: "geração longa — 14 anos; guias antigos ainda dizem '2009–presente'" },
    { codigo: "J250", de: 2023, ate: null, confianca: "firme" },
  ],

  // ★ A FAMÍLIA, pelas linhagens da linha principal. As fichas de LC100/200/300
  // e série 70 já existem no catálogo; aqui a faixa de ano serve ao anúncio que
  // escreveu só "Land Cruiser".
  "land cruiser": [
    { codigo: "J80", de: 1990, ate: 1997, confianca: "firme", nota: "linha principal 1990–1997, culto no Paraguai" },
    { codigo: "J100", de: 1998, ate: 2007, confianca: "firme" },
    { codigo: "J200", de: 2007, ate: 2021, confianca: "firme" },
    { codigo: "J300", de: 2021, ate: null, confianca: "firme" },
  ],

  // ⚠️ A ficha da Wikipédia lista a 2ª geração como "2010–presente", o que
  // contradiz todo o resto e é erro dela: 2010 é a PRIMEIRA. A 1ª seguiu sendo
  // produzida na América do Sul depois de sair da Europa em 2019 — e é
  // justamente essa que circula no Paraguai.
  amarok: [
    { codigo: "2H", de: 2010, ate: 2022, confianca: "firme", nota: "produção sul-americana seguiu após a saída da Europa em 2019; facelift grande em 2024" },
    { codigo: "NF", de: 2022, ate: null, confianca: "firme", nota: "irmã da Ford Ranger, montada pela Ford na África do Sul" },
  ],

  // ⚠️ Grand Carnival: as fontes divergem nas duas bordas — a Wikipédia dá
  // 2006–2014 para a VQ e um guia japonês dá 2005–2013. Fico com a Wikipédia e
  // marco estimado onde ela não fecha com as outras.
  "grand carnival": [
    { codigo: "KV-II", de: 1998, ate: 2005, confianca: "estimado", nota: "1ª geração, só entre-eixos curto" },
    { codigo: "VQ", de: 2006, ate: 2014, confianca: "estimado", nota: "⚠️ guia japonês diz 2005–2013; a diferença de um ano cai bem na borda" },
    { codigo: "YP", de: 2014, ate: 2020, confianca: "estimado", nota: "só entre-eixos longo" },
    { codigo: "KA4", de: 2020, ate: null, confianca: "firme", nota: "quando a Kia unifica o nome Carnival no mundo todo" },
  ],

  // ⚠️ NP300 é NOME DE MERCADO da D23, não geração separada — somar as duas
  // como coisas diferentes rachava o grupo no meio.
  navara: [
    { codigo: "D22", de: 1997, ate: 2005, confianca: "estimado", nota: "⚠️ fontes divergem entre 1997 e 1998; seguiu em produção na África do Sul depois da sucessora" },
    { codigo: "D40", de: 2005, ate: 2014, confianca: "estimado", nota: "⚠️ 2005–2014 ou 2005–2015 conforme a fonte; anúncio de 2004 é lançamento, não venda" },
    { codigo: "D23", de: 2014, ate: null, confianca: "firme", nota: "é a NP300 — mesmo carro, nome de mercado" },
  ],

  // ⚠️⚠️ SÃO DOIS CARROS COM O MESMO NOME, e isso é preço, não trivialidade: a
  // primeira é SUV coreana sobre plataforma GM Theta; a "segunda" é um Baojun
  // 530 chinês rebatizado. Agrupar as duas numa mediana seria o erro clássico
  // que este dicionário existe para impedir.
  captiva: [
    { codigo: "C100/C140", de: 2006, ate: 2018, confianca: "firme", nota: "irmã do Opel Antara; produção coreana encerrada em fev/2018" },
    { codigo: "CN202S", de: 2018, ate: null, confianca: "estimado", nota: "⚠️ Baojun 530 rebatizado, OUTRO carro — Colômbia nov/2018, Tailândia mar/2019; fontes divergem no ano de estreia por mercado" },
  ],

  // ⚠️ O Swift é o caso mais confuso do lote: uma fonte conta a geração de
  // 2004 até 2021, outra fecha em 2010, e as de 2017/2023 não têm código ZC
  // confirmado em nenhuma delas. Tudo estimado, de propósito.
  swift: [
    { codigo: "ZC11", de: 2004, ate: 2010, confianca: "estimado", nota: "⚠️ autocade estende o código ZC1 até 2021; carspiritpk fecha em 2010" },
    { codigo: "ZC72/FZ", de: 2010, ate: 2017, confianca: "estimado", nota: "⚠️ cars-data separa 2010–2014 e 2014–2017 como gerações distintas" },
    { codigo: "A2L", de: 2017, ate: 2023, confianca: "estimado", nota: "⚠️ sem código ZC confirmado em fonte" },
    { codigo: "A3L", de: 2023, ate: null, confianca: "estimado" },
  ],

  // ══════════════════════════════════════════════════════════════════════
  // LOTE 3 — o resto do topo da medição de 12/10/2026.
  //
  // ⚠️ PORTER FICOU DE FORA DE PROPÓSITO. São 27 anúncios e 25 órfãos, mas as
  // fontes não fecham: uma diz que a 3ª geração (1996) "ainda está em
  // produção", outra fala em quatro gerações com a 4ª atual, e nenhuma data o
  // corte. Inventar a borda aqui mandaria carro de 2004 e de 2021 para a mesma
  // mediana. Fica sem geração até alguém conferir em fonte coreana.
  //
  // Fontes deste lote: en.wikipedia.org (Chevrolet_Tracker, Chevrolet_Onix,
  // Toyota_Noah, Toyota_Sienta, Honda_HR-V, Kia_Cerato) · nissaninsider.co.uk ·
  // dic.pixiv.net (X-TRAIL) · motorpoint.co.uk (Tiguan) · evoindia.com (Hilux)
  // ══════════════════════════════════════════════════════════════════════

  // ⚠️⚠️ TRACKER SÃO TRÊS CARROS DIFERENTES com o mesmo nome. Na nossa base,
  // porém, TODOS os 68 anúncios são de 2014 para cá — ou seja, só os dois
  // últimos importam. Deixo o Vitara-based registrado mesmo assim, para que
  // um anúncio de 2002 que apareça amanhã não caia na geração errada.
  tracker: [
    { codigo: "Sidekick", de: 1989, ate: 1997, confianca: "estimado", nota: "irmão do Suzuki Sidekick, vendido como Geo até 1997" },
    { codigo: "Vitara", de: 1998, ate: 2004, confianca: "firme", nota: "irmão do Suzuki Vitara; fim da produção em Ingersoll em jan/2004" },
    { codigo: "Trax", de: 2013, ate: 2019, confianca: "estimado", nota: "⚠️ é o Trax rebatizado — a GM trocou o nome na América do Sul e na Rússia porque 'Trax' soa mal em português e em russo" },
    { codigo: "GEM", de: 2019, ate: null, confianca: "firme", nota: "1ª vez que o nome Tracker é de um carro próprio; plataforma GEM, estreia na China em 2019" },
  ],

  "x-trail": [
    { codigo: "T30", de: 2000, ate: 2007, confianca: "firme" },
    { codigo: "T31", de: 2007, ate: 2014, confianca: "estimado", nota: "⚠️ fontes divergem entre 2013 e 2014; há facelift em 2010" },
    { codigo: "T32", de: 2014, ate: 2022, confianca: "estimado", nota: "⚠️ uma fonte começa em 2013; facelift em 2017" },
    { codigo: "T33", de: 2022, ate: null, confianca: "firme" },
  ],

  /**
   * ⚠️⚠️ FRONTIER E NAVARA SÃO A MESMA PICAPE com dois nomes de mercado — as
   * mesmas gerações D22/D40/D23. Na nossa base são 43 e 41 anúncios, em
   * entradas SEPARADAS, e eu as mantive separadas DE PROPÓSITO.
   *
   * ★ O motivo não é teimosia com a regra de não traduzir nome: é que a
   * Frontier que circula no Paraguai costuma vir do Brasil/Argentina e a
   * Navara, do Japão — e o próprio catálogo já trata origem como fator de
   * preço (volante convertido × volante à esquerda de fábrica). Fundir as duas
   * numa mediana só é certo se o mercado paraguaio pagar igual pelas duas, e
   * isso é pergunta de praça, não de engenharia.
   *
   * ⚠️ Se a resposta for "é o mesmo carro e o mesmo preço", fundir é UMA LINHA
   * em ALIAS_CANONICO (modeloParaguai.ts) — fica anotado para a decisão do
   * Gustavo, não para eu decidir sozinho.
   */
  frontier: [
    { codigo: "D22", de: 1997, ate: 2005, confianca: "estimado", nota: "⚠️ fontes divergem entre 1997 e 1998" },
    { codigo: "D40", de: 2005, ate: 2014, confianca: "estimado", nota: "⚠️ 2005–2014 ou 2005–2015 conforme a fonte" },
    { codigo: "D23", de: 2014, ate: null, confianca: "firme", nota: "mesma geração da Navara NP300 — ver a nota acima sobre manter as duas separadas" },
  ],

  tiguan: [
    { codigo: "5N", de: 2007, ate: 2016, confianca: "firme" },
    { codigo: "AD", de: 2016, ate: 2024, confianca: "firme", nota: "o Allspace é BW, mesma geração; não existe Allspace na 3ª" },
    { codigo: "CT1", de: 2024, ate: null, confianca: "estimado", nota: "⚠️ uma fonte data 2023, outra 2024, e a América do Norte só recebe em meados de 2025" },
  ],

  onix: [
    { codigo: "Gamma II", de: 2013, ate: 2019, confianca: "firme", nota: "estreia no Salão de SP em out/2012, produção a partir de 2013; projetado só para a América do Sul. O sedã é o Prisma" },
    { codigo: "GEM", de: 2019, ate: null, confianca: "firme", nota: "mesma plataforma GEM do Tracker novo; aqui o sedã passa a se chamar Onix Plus" },
  ],

  hilux: [
    { codigo: "AN10/AN20/AN30", de: 2004, ate: 2015, confianca: "firme", nota: "primeira Hilux não produzida no Japão — desenvolvida na Tailândia" },
    { codigo: "AN120/AN130", de: 2015, ate: 2025, confianca: "firme" },
    { codigo: "AN220/AN230", de: 2025, ate: null, confianca: "estimado", nota: "⚠️ 9ª geração, fonte única (Top Gear NL)" },
  ],

  // ★ Voxy é a gêmea da Noah e divide os MESMOS códigos R — as entradas têm de
  // ser idênticas, senão o mesmo carro cai em grupos diferentes conforme o nome
  // que o anunciante escolheu escrever.
  voxy: [
    { codigo: "R60", de: 2001, ate: 2007, confianca: "firme", nota: "produção nov/2001 – jun/2007, plataforma da Ipsum" },
    { codigo: "R70", de: 2007, ate: 2014, confianca: "firme" },
    { codigo: "R80", de: 2014, ate: 2021, confianca: "estimado", nota: "⚠️ fonte de revendedor; facelift por volta de 2017" },
    { codigo: "R90", de: 2022, ate: null, confianca: "estimado", nota: "⚠️ fonte única; plataforma TNGA GA-C" },
  ],

  sienta: [
    { codigo: "XP80", de: 2003, ate: 2015, confianca: "estimado", nota: "⚠️ saiu de linha em 2010 e VOLTOU sem mudanças em mai/2011 — por isso há fonte que fecha em 2010" },
    { codigo: "XP170", de: 2015, ate: 2022, confianca: "firme", nota: "estreia em 09/07/2015" },
    { codigo: "XP210", de: 2022, ate: null, confianca: "estimado" },
  ],

  note: [
    { codigo: "E11", de: 2004, ate: 2013, confianca: "estimado", nota: "⚠️ fontes divergem: 2004–2013 ou 2005–2012; venda no Japão começa em 2005" },
    { codigo: "E12", de: 2013, ate: 2020, confianca: "estimado", nota: "⚠️ 2012 ou 2013 conforme a fonte; o e-Power entra no facelift de fim de 2016" },
    { codigo: "E13", de: 2020, ate: null, confianca: "firme", nota: "produção a partir de dez/2020 — a data mais consistente entre as fontes" },
  ],

  "hr-v": [
    { codigo: "GH", de: 1999, ate: 2006, confianca: "firme", nota: "sobre o Honda Logo; 3 e 5 portas (GH2/GH4)" },
    { codigo: "RU", de: 2013, ate: 2021, confianca: "estimado", nota: "⚠️ produção começa no fim de 2013 no Japão (lá é Vezel) e só chega a muitos mercados em 2014/2015 — o 'ano' do anúncio paraguaio costuma ser o de exportação" },
    { codigo: "RV", de: 2021, ate: null, confianca: "firme", nota: "⚠️ a versão norte-americana é OUTRO carro, maior (código RZ)" },
  ],

  cerato: [
    { codigo: "TD", de: 2008, ate: 2013, confianca: "estimado", nota: "⚠️ lançada na Coreia no fim de 2008 como Forte; a linha norte-americana começa em 2010" },
    { codigo: "YD", de: 2013, ate: 2018, confianca: "estimado", nota: "⚠️ 2013 na Ásia, 2014 na América do Norte; refresco em 2017" },
    { codigo: "BD", de: 2018, ate: null, confianca: "estimado", nota: "⚠️ fontes dão 2018 ou 2019 conforme o mercado; facelift em 2022" },
  ],


  // ══════════════════════════════════════════════════════════════════════
  // LOTE 4 — fecha a lista do que a medição de 12/10 apontou.
  //
  // ★ Vale notar um caso que parece inútil e não é: COOLRAY tem UMA geração
  // só. Não há o que separar — e é exatamente por isso que a ficha ganha. Sem
  // ela, os 21 anúncios viram seis linhas de ano com 2 a 4 ofertas cada,
  // nenhuma publicável; com ela, viram UMA linha com n=21.
  //
  // Fontes deste lote: en.wikipedia.org (Dodge_Durango, Mercedes-Benz_GLA,
  // Suzuki_Vitara, Fiat_Strada, Geely_Binyue) · jeepspecs.com · carwiki.de ·
  // topgear.nl (Mercedes Sprinter, Audi Q3, Mercedes GLA) ·
  // autocade.net (Audi_Q3_(8U)) · bumper.com (F-Series) · vrum.com.br e
  // gmauthority.com (S10 Brasil) · dimaggio/autofiles (Corolla)
  // ══════════════════════════════════════════════════════════════════════

  durango: [
    { codigo: "DN", de: 1998, ate: 2003, confianca: "estimado" },
    { codigo: "HB", de: 2004, ate: 2009, confianca: "estimado", nota: "⚠️ a Wikipédia dá o intervalo 1998–2009 sem separar as duas primeiras" },
    { codigo: "WD", de: 2011, ate: null, confianca: "firme", nota: "★ geração longuíssima — produção desde dez/2010 e segue; atualizações grandes em 2017 e 2021 são FACELIFT, não geração nova. Mesma plataforma do Grand Cherokee" },
  ],

  // ⚠️ A numeração da F-150 é uma bagunça entre publicações — a mesma safra
  // 2009–2014 aparece como 12ª numa fonte e 13ª em outra. Os ANOS DE CORTE,
  // que é o que importa aqui, são consistentes; os nomes das gerações, não.
  // Por isso o código usa o ano, não o ordinal.
  "f-150": [
    { codigo: "P221", de: 2004, ate: 2008, confianca: "estimado", nota: "⚠️ safra com fama ruim de motor e qualidade — vale lembrar quando a mediana desta faixa parecer baixa demais" },
    { codigo: "P415", de: 2009, ate: 2014, confianca: "estimado", nota: "entra o EcoBoost 3.5 V6 biturbo" },
    { codigo: "P552", de: 2015, ate: 2020, confianca: "estimado", nota: "carroceria de alumínio" },
    { codigo: "P702", de: 2021, ate: null, confianca: "estimado", nota: "⚠️ nenhuma das fontes desta rodada confirmou o corte de 2021; é a numeração corrente do mercado" },
  ],

  sprinter: [
    { codigo: "T1N", de: 1995, ate: 2006, confianca: "firme", nota: "W901–W905 conforme o peso bruto; nos EUA chegou em 2001 com emblema Freightliner" },
    { codigo: "NCV3", de: 2006, ate: 2018, confianca: "firme", nota: "W906" },
    { codigo: "VS30", de: 2018, ate: null, confianca: "estimado", nota: "⚠️ W907/W910; uma fonte diz lançamento mundial só em 2019. Primeira Sprinter com tração dianteira" },
  ],

  q3: [
    { codigo: "8U", de: 2011, ate: 2018, confianca: "firme", nota: "sobre a base do Tiguan 5N; facelift em 2015" },
    { codigo: "F3", de: 2018, ate: 2025, confianca: "firme" },
    { codigo: "FJ", de: 2025, ate: null, confianca: "estimado", nota: "⚠️ fonte única (Top Gear NL)" },
  ],

  // ⚠️ O Grand Cherokee é o modelo em que as fontes MAIS se contradizem neste
  // lote: WK aparece como 2005–2010 numa e como 2010–2013 em outra, e há quem
  // chame a safra de 2005 de WH. Fico com o corte que os guias de entusiasta
  // sustentam e marco quase tudo estimado.
  "grand cherokee": [
    { codigo: "ZJ", de: 1993, ate: 1998, confianca: "estimado", nota: "só com o 4.0 seis-em-linha da AMC" },
    { codigo: "WJ", de: 1999, ate: 2004, confianca: "estimado", nota: "⚠️ há fonte que estende até 2005" },
    { codigo: "WK", de: 2005, ate: 2010, confianca: "estimado", nota: "⚠️ aparece como WH em fonte alemã" },
    { codigo: "WK2", de: 2011, ate: 2021, confianca: "estimado", nota: "⚠️ fontes dão 2010–2013 para o mesmo código; é a safra que os entusiastas chamam de WK2" },
    { codigo: "WL", de: 2021, ate: null, confianca: "estimado", nota: "⚠️ produção no fim de 2021, ano-modelo 2022" },
  ],

  "gla-class": [
    { codigo: "X156", de: 2013, ate: 2020, confianca: "firme", nota: "revelado em ago/2013, antes do Salão de Frankfurt" },
    { codigo: "H247", de: 2020, ate: null, confianca: "firme", nota: "⚠️ revelado online em 11/12/2019; há fonte que já aponta um H244 elétrico a partir de 2026" },
  ],

  // ⚠️ A S10 brasileira é OUTRA LINHAGEM da norte-americana, e a contagem muda
  // conforme de onde se conta. Aqui vale a brasileira, que é a que roda na
  // fronteira.
  //
  // ⚠️⚠️ A 3ª geração EXISTE — há fonte chamando o ano-modelo 2026 de
  // "terceira geração" — mas NENHUMA fonte desta rodada deu o ano de corte.
  // Deixo a 2ª aberta de propósito: um corte inventado jogaria picape de 2013
  // e de 2025 em grupos errados, e aberto o erro é no máximo de agrupar demais.
  s10: [
    { codigo: "BR-1", de: 1995, ate: 2011, confianca: "estimado", nota: "lançamento no Brasil em jul/1995; cabine dupla em 1997, reestilizações em 2000 ('Pitbull') e 2005, flex 2.4 em 2007" },
    { codigo: "BR-2", de: 2012, ate: null, confianca: "estimado", nota: "⚠️ irmã da Colorado. Existe 3ª geração em fonte recente, mas nenhuma deu o ano — não invento o corte" },
  ],

  strada: [
    { codigo: "178E", de: 1998, ate: 2020, confianca: "estimado", nota: "⚠️ venda no Brasil desde out/1998 (não 1996, que é só legenda de foto); facelift de Giugiaro em 2001. Geração de 22 anos" },
    { codigo: "281", de: 2020, ate: null, confianca: "firme", nota: "apresentada em 26/06/2020; plataforma MC-P do Argo, cabine em parte do Mobi" },
  ],

  /**
   * ⚠️⚠️ VITARA E GRAND VITARA SÃO A MESMA LINHAGEM com o nome mudando: a 2ª e
   * a 3ª gerações se chamaram GRAND Vitara, e a 4ª voltou a ser só Vitara.
   * Por isso esta lista cobre as quatro — um anúncio escrito "Vitara 2008" é
   * quase certamente um Grand Vitara JT, e mandá-lo para um grupo vazio seria
   * pior do que agrupá-lo pela linhagem certa.
   *
   * ⚠️ `grand vitara` tem entrada própria no catálogo e NÃO recebe esta lista:
   * quem escreveu "Grand" está sendo específico, e respeitar isso é a mesma
   * regra do Pajero Junior × Pajero Full.
   */
  vitara: [
    { codigo: "ET/TA", de: 1988, ate: 1998, confianca: "estimado" },
    { codigo: "FT/GT", de: 1998, ate: 2005, confianca: "estimado", nota: "é o 1º Grand Vitara" },
    { codigo: "JT", de: 2005, ate: 2015, confianca: "estimado", nota: "⚠️ uma fonte fecha em 2017, outra em 2008 (essa última é de variante, não da geração)" },
    { codigo: "LY", de: 2015, ate: null, confianca: "firme", nota: "volta a se chamar só Vitara; conviveu alguns anos com a JT" },
  ],

  /**
   * ⚠️⚠️ "COROLLA" AQUI É O SEDÃ, e só ele. Axio, Fielder, Runx e Cross têm
   * ficha PRÓPRIA no catálogo porque no Paraguai são carros distintos — foi o
   * próprio Gustavo quem corrigiu isso ("tenho que separar como modelos, não
   * como versões"). Esta lista não pode ser usada para eles.
   *
   * ⚠️ O E120 seguiu em produção na China até 2017, muito depois de sair de
   * linha no Japão. Anúncio paraguaio de "Corolla 2012" pode ser um chinês
   * E120 e não um E140 — mais um motivo para o corte de borda cair no carro
   * mais velho, como a função geracaoDoAno já faz de propósito.
   */
  corolla: [
    { codigo: "E100", de: 1991, ate: 1995, confianca: "estimado" },
    { codigo: "E110", de: 1995, ate: 2000, confianca: "firme", nota: "lançada em mai/1995; dividiu plataforma com a anterior para cortar custo" },
    { codigo: "E120", de: 2000, ate: 2006, confianca: "firme", nota: "sedã e perua em ago/2000, hatch em jan/2001. ⚠️ seguiu na China até 2017" },
    { codigo: "E140/E150", de: 2006, ate: 2013, confianca: "estimado", nota: "E140 é a japonesa; E150 a de carroceria larga, China e Europa a partir de 2007" },
    { codigo: "E170", de: 2013, ate: 2018, confianca: "estimado", nota: "⚠️ há fonte que estende E170/E180 até 2024; no Japão/Hong Kong a equivalente é a E160, menor" },
    { codigo: "E210", de: 2018, ate: null, confianca: "firme" },
  ],

  // ★ UMA geração só desde 2018 — e é justamente isso que faz a ficha valer:
  // sem ela os 21 anúncios viram seis linhas de ano com 2 a 4 ofertas e nenhuma
  // mediana publicável.
  //
  // ⚠️ As mudanças de 2021, 2022 e 2023 são FACELIFT, não geração nova. Uma
  // base de dados conta a safra 2018–2021 como "descontinuada" e as seguintes
  // como modelos à parte — é artefato de catálogo de peças, não história do
  // carro.
  coolray: [
    { codigo: "SX11", de: 2018, ate: null, confianca: "firme", nota: "no Brasil/Paraguai o nome é Coolray; na China, Binyue. Plataforma BMA" },
  ],


  // ══════════════════════════════════════════════════════════════════════
  // LOTE 5 — a medição refeita depois do lote 4 ainda apontava 1.738 órfãos.
  //
  // Fontes: en.wikipedia.org (Ford_Ranger, Jeep_Wrangler, BMW_X1, BMW_F48) ·
  // topgear.nl (Santa Fe, CR-V) · autohled.cz (Santa Fe) · jeepspecs.com ·
  // jdmbuysell.com/learn/suzuki/jimny/jb64 · carexpert.com.au (Jimny) ·
  // motor1.com (Elantra) · mercadolivre.com.br/blog (Saveiro) ·
  // autoblog.com.uy (Ranger regional, Saveiro/Gol)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * ⚠️⚠️ A RANGER DA FRONTEIRA NÃO É A AMERICANA. Antes de 2011 a América do
   * Sul tinha uma linhagem PRÓPRIA, produzida na Argentina desde 1998, com
   * cabine dupla que a América do Norte nunca teve. Só a partir da T6 (2011) o
   * mundo todo passou a ter a mesma picape.
   *
   * ⚠️ A T6.2 (P703) é de 2021/2022 no mundo, mas só chegou ao Mercosul em
   * 2023 — produzida em General Pacheco. Para o anúncio paraguaio, o corte que
   * vale é o do Mercosul, não o global.
   */
  ranger: [
    { codigo: "AR", de: 1998, ate: 2011, confianca: "estimado", nota: "linhagem sul-americana produzida na Argentina; última atualização de carroceria em 2010" },
    { codigo: "T6", de: 2011, ate: 2022, confianca: "firme", nota: "primeira Ranger global; facelift em 2015. Base da Mazda BT-50 de 2ª geração" },
    { codigo: "T6.2", de: 2023, ate: null, confianca: "estimado", nota: "⚠️ P703: 2021/2022 no mundo, mas Mercosul só em 2023. Plataforma dividida com a Amarok nova" },
  ],

  "santa fe": [
    { codigo: "SM", de: 2000, ate: 2006, confianca: "firme" },
    { codigo: "CM", de: 2006, ate: 2012, confianca: "firme", nota: "1ª Santa Fe produzida nos EUA" },
    { codigo: "DM", de: 2012, ate: 2018, confianca: "firme", nota: "entra a opção de 7 lugares" },
    { codigo: "TM", de: 2018, ate: 2023, confianca: "firme", nota: "entram híbrido e híbrido plug-in" },
    { codigo: "MX5", de: 2023, ate: null, confianca: "estimado", nota: "⚠️ fonte sueca diz 2024" },
  ],

  wrangler: [
    { codigo: "YJ", de: 1986, ate: 1995, confianca: "firme", nota: "faróis retangulares — o único Wrangler assim" },
    { codigo: "TJ", de: 1996, ate: 2006, confianca: "estimado", nota: "⚠️ 1996 ou 1997 conforme a fonte; volta o farol redondo e entra a suspensão helicoidal" },
    { codigo: "JK", de: 2006, ate: 2018, confianca: "estimado", nota: "⚠️ 2006 ou 2007; primeiro Wrangler de 4 portas (Unlimited)" },
    { codigo: "JL", de: 2018, ate: null, confianca: "firme" },
  ],

  "cr-v": [
    { codigo: "RD1-3", de: 1995, ate: 2001, confianca: "estimado" },
    { codigo: "RD4-9", de: 2001, ate: 2006, confianca: "estimado" },
    { codigo: "RE", de: 2006, ate: 2011, confianca: "estimado" },
    { codigo: "RM", de: 2011, ate: 2016, confianca: "estimado", nota: "⚠️ fontes dão 2012–2016 também" },
    { codigo: "RW/RT", de: 2016, ate: 2022, confianca: "estimado", nota: "híbrido entra em 2018" },
    { codigo: "RS", de: 2022, ate: null, confianca: "estimado", nota: "⚠️ a lista inteira vem do Top Gear NL; outras bases contam facelift como geração e chegam a 11" },
  ],

  /**
   * ⚠️ O Jimny tem DUAS linhagens convivendo: o kei JB64 (660cc, só Japão) e o
   * JB74 Sierra, mais largo e 1.5. No Paraguai aparecem os dois, e eles NÃO
   * valem o mesmo — mas o anúncio raramente distingue, então ficam na mesma
   * geração por ano. Fica a ressalva para quem for olhar a mediana de perto.
   */
  jimny: [
    { codigo: "SJ", de: 1981, ate: 1998, confianca: "estimado" },
    { codigo: "JA", de: 1990, ate: 1998, confianca: "estimado", nota: "⚠️ conviveu com o fim do SJ — faixa de ano se sobrepõe de verdade, não é erro" },
    { codigo: "JB23", de: 1998, ate: 2018, confianca: "estimado", nota: "⚠️ fontes fecham em 2017 ou 2018. Geração de 20 anos" },
    { codigo: "JB64", de: 2018, ate: null, confianca: "firme", nota: "jul/2018; o JB74 Sierra é a versão larga 1.5 de exportação" },
  ],

  elantra: [
    { codigo: "J2", de: 1995, ate: 2000, confianca: "estimado" },
    { codigo: "XD", de: 2000, ate: 2006, confianca: "firme", nota: "1º Elantra montado em várias fábricas da Hyundai pelo mundo" },
    { codigo: "HD", de: 2006, ate: 2010, confianca: "estimado", nota: "⚠️ alguns catálogos estendem até 2012" },
    { codigo: "MD", de: 2010, ate: 2015, confianca: "estimado", nota: "UD nos EUA" },
    { codigo: "AD", de: 2015, ate: 2020, confianca: "estimado" },
    { codigo: "CN7", de: 2020, ate: null, confianca: "firme", nota: "revelado em 17/03/2020" },
  ],

  /**
   * ⚠️⚠️ ACCENT É O MAIS FRACO DESTE LOTE e está marcado todo como estimado:
   * as datas vieram de CATÁLOGO DE PEÇAS (7zap), não de fonte de produção. Uma
   * das entradas do próprio catálogo lista a geração MC indo até 2024, o que é
   * claramente erro de dado. Uso as faixas que não se contradizem e deixo o
   * aviso — é o tipo de linha que, se a mediana sair estranha, deve ser a
   * primeira suspeita.
   */
  accent: [
    { codigo: "X3", de: 1994, ate: 1999, confianca: "estimado", nota: "⚠️ fonte é catálogo de peças" },
    { codigo: "LC", de: 1999, ate: 2006, confianca: "estimado", nota: "⚠️ catálogo global estende a 2007" },
    { codigo: "MC", de: 2006, ate: 2011, confianca: "estimado", nota: "⚠️ um catálogo diz até 2024 — erro evidente de dado" },
    { codigo: "RB", de: 2011, ate: 2017, confianca: "estimado", nota: "facelift RB/RC a partir de 2014" },
    { codigo: "HC", de: 2017, ate: null, confianca: "estimado", nota: "⚠️ fim varia por região; há um BN7 novo em catálogo global" },
  ],

  // ⚠️ A Saveiro acompanha a família Gol, e o que a VW chamou de "G4" era, nas
  // palavras da própria imprensa da época, só um facelift da 3ª geração de
  // 2000. Mantenho o nome comercial porque é como o anúncio escreve.
  saveiro: [
    { codigo: "G4", de: 2005, ate: 2009, confianca: "estimado", nota: "⚠️ 'quarta geração' era facelift da de 2000, segundo a imprensa da época" },
    { codigo: "G5", de: 2009, ate: 2013, confianca: "estimado", nota: "⚠️ há fonte que começa em 2008; entra a cabine estendida" },
    { codigo: "G6", de: 2013, ate: 2017, confianca: "estimado", nota: "⚠️ linha do Gol fecha o G6 em 2016" },
    { codigo: "G7", de: 2017, ate: null, confianca: "estimado", nota: "⚠️ anúncios de usado começam em 2018" },
  ],

  x1: [
    { codigo: "E84", de: 2009, ate: 2015, confianca: "estimado", nota: "⚠️ base do Série 3 E90, tração traseira — diferente de tudo que veio depois" },
    { codigo: "F48", de: 2015, ate: 2022, confianca: "firme", nota: "produção jun/2015 – jun/2022; passa à plataforma dianteira UKL2" },
    { codigo: "U11", de: 2022, ate: null, confianca: "estimado", nota: "⚠️ 2022 ou 2023 conforme a fonte" },
  ],


  // ══════════════════════════════════════════════════════════════════════
  // LOTE 6 — Mustang, Tucson, Sorento, Renegade.
  //
  // Fontes: en.wikipedia.org (Ford_Mustang_(sixth_generation), Hyundai_Tucson,
  // Kia_Sorento) · motor1.com · cjponyparts.com · topgear.nl (Tucson) ·
  // cars-data.com/en/jeep/renegade · carscoops.com (Renegade 2ª reestilização)
  // ══════════════════════════════════════════════════════════════════════

  mustang: [
    { codigo: "S197", de: 2005, ate: 2014, confianca: "firme", nota: "o retrô volta; facelift em 2010" },
    { codigo: "S550", de: 2015, ate: 2023, confianca: "firme", nota: "produção ago/2014 – abr/2023. 1º Mustang global e com suspensão traseira independente de série; o V6 3.7 sai depois de 2017" },
    { codigo: "S650", de: 2024, ate: null, confianca: "estimado", nota: "⚠️ revelado em set/2022, chega ao mercado em 2024" },
  ],

  // ⚠️ A 2ª geração se chamou ix35 em muitos mercados — e o nome Tucson só
  // voltou na 3ª. Anúncio paraguaio de "Tucson 2012" pode ser um ix35; são o
  // mesmo carro, então a faixa LM os cobre.
  tucson: [
    { codigo: "JM", de: 2004, ate: 2009, confianca: "estimado", nota: "sobre a plataforma do Elantra" },
    { codigo: "LM", de: 2009, ate: 2015, confianca: "estimado", nota: "⚠️ vendido como ix35 em boa parte do mundo" },
    { codigo: "TL", de: 2015, ate: 2020, confianca: "estimado", nota: "⚠️ há fonte com 2016–2021; facelift em 2018" },
    { codigo: "NX4", de: 2020, ate: null, confianca: "estimado", nota: "facelift em 2024" },
  ],

  // ⚠️ O Sorento muda de natureza entre a 1ª e a 2ª: BL é chassi sobre
  // longarinas (SUV de verdade), XM em diante é monobloco de crossover. Não é
  // detalhe de ficha — é outro carro, e a nota do catálogo sobre importada x
  // oficial continua valendo por cima disso.
  sorento: [
    { codigo: "BL", de: 2002, ate: 2010, confianca: "estimado", nota: "⚠️ 2002–2009 ou 2003–2010 conforme a fonte. Chassi sobre longarinas" },
    { codigo: "XM", de: 2009, ate: 2015, confianca: "estimado", nota: "⚠️ a faixa mais divergente do lote: 2006–2015, 2009–2014 ou 2011–2014 conforme a fonte. Passa a monobloco, plataforma do Santa Fe; facelift em 2012" },
    { codigo: "UM", de: 2015, ate: 2020, confianca: "estimado", nota: "facelift em 2017" },
    { codigo: "MQ4", de: 2020, ate: null, confianca: "estimado", nota: "⚠️ 2020 ou 2021 conforme a fonte" },
  ],

  /**
   * ⚠️⚠️ O RENEGADE TEM UMA GERAÇÃO SÓ (BU) e DUAS reestilizações — e a
   * segunda é EXCLUSIVA DA AMÉRICA DO SUL, a partir de 2022. Isso importa aqui
   * mais do que importaria em outro lugar: é justamente a versão que roda na
   * fronteira.
   *
   * ⚠️ Registro as reestilizações como "gerações" porque é o que separa preço
   * no pátio, e porque as bases de dados que o mercado consulta fazem o mesmo.
   * Mas são facelifts — está escrito aqui para ninguém confundir com mudança
   * de plataforma.
   */
  renegade: [
    { codigo: "BU", de: 2014, ate: 2018, confianca: "estimado" },
    { codigo: "BU-FL1", de: 2018, ate: 2022, confianca: "estimado", nota: "1ª reestilização — facelift, não geração nova" },
    { codigo: "BU-FL2", de: 2022, ate: null, confianca: "estimado", nota: "★ 2ª reestilização, exclusiva da América do Sul; nos EUA o Renegade saiu de linha em 2023" },
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
