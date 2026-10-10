/**
 * Leitura de preço dos anúncios paraguaios — guarani e dólar.
 *
 * ★ Construído em 23/09/2026 a partir de anúncios REAIS, lidos no ClasiPar,
 * WebAuto e Ajogua. Todo formato e toda armadilha aqui saiu de coisa que está
 * publicada agora, não de suposição.
 *
 * DUAS MOEDAS DE ORIGEM, TRÊS NA TELA. No Paraguai se anuncia em guarani ou
 * em dólar — ninguém anuncia em real. O real é só LEITURA, convertido na hora
 * de exibir com a cotação do dia. Por isso este módulo NÃO converte nada: ele
 * devolve o preço na moeda em que foi anunciado, que é o fato, e é ele que
 * vira base da tabela semanal e depois mensal.
 *
 * ⚠️ E ele precisa DESCONFIAR. Na primeira página de dois sites, sem procurar,
 * apareceram três tipos de lixo que destroem qualquer média ingênua — é
 * provavelmente por isso que ninguém no Paraguai publicou uma tabela de preço
 * médio ainda. Cada guarda abaixo existe por causa de um anúncio específico.
 */

export type MoedaPY = "PYG" | "USD";

export type LeituraPreco =
  | { ok: true; valor: number; moeda: MoedaPY; corrigido?: "moeda_trocada" }
  | { ok: false; motivo: MotivoDescarte; valorBruto?: number; moedaBruta?: MoedaPY };

export type MotivoDescarte =
  | "sem_preco"        // não achei número nenhum
  | "preco_isca"       // Gs. 1, US$ 1,00 — vendedor fugindo do filtro
  | "outro_mercado"    // anunciado em REAL → é carro brasileiro
  | "escala_ambigua"   // ₲ com número de dólar: o valor é real, a escala não
  | "fora_de_faixa"    // valor que não descreve carro em nenhuma das moedas
  | "telefone"        // o "preço" é um celular paraguaio
  | "entrada_financiamento"; // o número é a ENTRADA, não o preço do carro

/**
 * Faixas plausíveis para um CARRO. Deliberadamente largas: a função corta
 * absurdo, não julga barganha. Quem decide o que é caro é a tabela, depois.
 */
const FAIXA = {
  // ~5 milhões de Gs é um carro muito velho; 2 bilhões cobre importado de luxo.
  PYG: { min: 5_000_000, max: 2_000_000_000 },
  // US$ 500 é sucata; US$ 500 mil cobre qualquer coisa que se anuncie por lá.
  USD: { min: 500, max: 500_000 },
} as const;

/**
 * ★★ CELULAR PARAGUAIO LIDO COMO PREÇO — achado em 05/10/2026.
 *
 * Um anúncio "Cars sur automores" entrou com ₲992.363.005. O Gustavo reconheceu
 * na hora: "992.363.005 é número de celular daqui". É o 0992 363 005 sem o zero.
 *
 * ⚠️ A guarda de faixa NÃO pega: ₲992 milhões ≈ US$ 123 mil, valor plausível
 * para carro de luxo. O que denuncia é a FORMA — preço paraguaio é redondo
 * (medido: 54 de 98 preços em guarani são múltiplos exatos de 5 milhões), e
 * nenhum vendedor pede 992 milhões e 363 mil e 5 guaranis.
 *
 * A regra olha só a parte alta, onde mora o telefone: acima de ₲100 milhões, um
 * preço de verdade é redondo em pelo menos 100 mil.
 */
const pareceTelefonePY = (valor: number): boolean =>
  valor >= 100_000_000 && valor % 100_000 !== 0;

/**
 * ★★ ENTRADA DE FINANCIAMENTO LIDA COMO PREÇO — mesmo dia.
 *
 * "FINANCIO CON 13.245.000 DE ENTREGA" virou um carro de ₲13.245.000. O número
 * é real, mas é a ENTRADA, não o preço — o carro custa muito mais.
 *
 * ⚠️ Descartar é melhor que salvar barato: um "carro" de ₲13 milhões no meio da
 * amostra puxa a mediana do modelo para baixo e faz a referência mentir no lado
 * que mais dói, o de quem vai comprar achando que pagou caro.
 */
/**
 * ⚠️ AMARRADA AO NÚMERO, não ao anúncio. Muito anúncio legítimo diz "Financio"
 * E tem preço de verdade no campo — rejeitar todos eles seria pior que o
 * problema. O que denuncia é o número COLADO na palavra:
 *
 *     "FINANCIO CON 13.245.000 DE ENTREGA"   → 13.245.000 é entrada
 *     "Kia Rio 2017 1.4 Mec — Financio"      → preço de verdade, passa
 *
 * Só descarta quando o valor lido é exatamente o que está grudado em
 * "de entrega" / "de entrada" / "de anticipo".
 */
const RX_VALOR_DE_ENTRADA =
  /([\d][\d.,]{3,})\s*(?:gs\.?|₲)?\s*(?:de\s+)?(entrega|entrada|anticipo|refuerzo)\b/i;

/** O mesmo número, escrito de trás pra frente: "entrega de 13.245.000". */
const RX_ENTRADA_DE_VALOR =
  /\b(entrega|entrada|anticipo|refuerzo)\s+(?:de\s+)?([\d][\d.,]{3,})/i;

/** Acima disto, "dólar" quase certamente é guarani digitado no campo errado. */
const TETO_DOLAR_CRIVEL = 300_000;

/**
 * Faixa em que um valor marcado com ₲ é ambíguo: alto demais para ser isca
 * (₲1, ₲40) e baixo demais para ser preço de carro em guarani, mas bem no
 * meio da faixa de preço de carro em DÓLAR.
 *
 * O piso em 1.000 preserva a detecção de isca de verdade; o teto em 500.000
 * é o mesmo da faixa de dólar, acima do qual volta a ser guarani plausível.
 */
const LIMIAR_ESCALA = { min: 1_000, max: 500_000 };

const RX_GUARANI = /(?:\bGs\.?|₲|\bGuaran[ií]e?s?\b|\bPYG\b)/i;
// O "$" pode vir ANTES ou DEPOIS do número — "$ 30.000" e "30.000$" convivem
// nos anúncios paraguaios (observado pelo Gustavo em 23/09).
const RX_DOLAR = /(?:US\s?\$|\bUSD\b|\bU\$S\b|(?<![A-Za-z])\$|\d\s?\$)/i;

/**
 * ★★ REAL = CARRO BRASILEIRO, e isso é regra de mercado, não de formatação.
 *
 * Do Gustavo (23/09): "carro que está dentro do Paraguai, com placa paraguaia,
 * não é anunciado em real". A praça de Ciudad del Este fica a poucos
 * quilômetros da fronteira, então anúncio do lado de lá aparece na busca —
 * mas é outro mercado, com outro imposto e outro comprador. Entrar na mesma
 * tabela de referência a envenenaria.
 *
 * ⚠️ E sem esta regra o estrago era SILENCIOSO: "R$ 50.000" não casava em
 * nenhum símbolo e caía na regra de grandeza, sendo lido como **USD 50.000**
 * — cinquenta mil dólares, quase seis vezes o valor. Medido em 23/09.
 *
 * A cidade NÃO serve para isso: na primeira sondagem ela veio "Foz do Iguaçu"
 * em anúncios que, conferidos na página pelo Gustavo, não eram de Foz. A moeda
 * é o sinal confiável.
 */
const RX_REAL = /(?:R\$|\bBRL\b|\breais\b)/i;

/**
 * Converte o texto do número para valor, no formato es-PY: ponto separa
 * milhar e vírgula separa decimal ("36.500,00" = trinta e seis mil e meio).
 *
 * ⚠️ Não dá para usar Number() direto: "97.500.000" viraria 97.5 e o carro de
 * noventa e sete milhões de guaranis vira noventa e sete reais e pouco.
 */
function numeroPY(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,]/g, "");
  if (!limpo) return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normal: string;
  if (temVirgula && temPonto) {
    // "36.500,00" → ponto é milhar, vírgula é decimal
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // Só vírgula: decimal se sobrarem 1 ou 2 casas ("1,00"), milhar se 3 ("1,500")
    const depois = limpo.split(",")[1] ?? "";
    normal = depois.length === 3 ? limpo.replace(/,/g, "") : limpo.replace(",", ".");
  } else if (temPonto) {
    // Só ponto: decimal se sobrarem 1 ou 2 casas, senão é milhar.
    const depois = limpo.split(".").pop() ?? "";
    normal = limpo.split(".").length > 2 || depois.length === 3
      ? limpo.replace(/\./g, "")
      : limpo;
  } else {
    normal = limpo;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê o preço de um anúncio paraguaio.
 *
 * @param texto  o trecho de preço como aparece na página ("Gs. 97.500.000")
 */
/**
 * ⚠️ O JSON do Facebook entrega o símbolo do guarani ESCAPADO: chega a
 * sequência literal `₲`, não o caractere "₲". Medido na primeira sonda
 * real de Ciudad del Este (23/09): `₲110.000.000` foi lido como
 * **202.110.000.000** — o "20b2" do escape entrou como dígito e o preço ganhou
 * três casas. Um carro de cento e dez milhões de guaranis virou duzentos e dois
 * BILHÕES, o que passaria direto pelo teto de faixa e envenenaria a tabela.
 *
 * A decodificação mora AQUI, e não em quem chama, justamente para não depender
 * de alguém lembrar.
 */
function desescapar(s: string): string {
  return s.includes("\\u")
    ? s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    : s;
}

export function lerPreco(bruto: string): LeituraPreco {
  const texto = desescapar(bruto ?? "");
  if (!texto) return { ok: false, motivo: "sem_preco" };

  const ehGuarani = RX_GUARANI.test(texto);
  const ehReal = RX_REAL.test(texto);
  // "R$" contém "$": sem excluir o real aqui, todo preço brasileiro seria
  // lido como dólar.
  const ehDolar = !ehReal && RX_DOLAR.test(texto);
  const valor = numeroPY(texto);

  if (valor === null || valor <= 0) return { ok: false, motivo: "sem_preco" };

  // Real = mercado brasileiro. Fora, antes de qualquer outra avaliação.
  if (ehReal) return { ok: false, motivo: "outro_mercado", valorBruto: valor };

  // ⚠️ PREÇO-ISCA. Real, no ClasiPar: "TOYOTA 4RUNNER — Gs. 130" e
  // "RAM 1500 RHO 2025 — US$. 1,00". É o vendedor escapando do filtro de preço
  // de quem busca por faixa. Entra na média como se fosse oferta e a arrasta
  // para baixo — um desses num modelo raro já estraga a linha da tabela.
  // ⚠️ ORDEM IMPORTA. Em guarani, "abaixo do mínimo" NÃO é sinônimo de isca:
  // entre ₲1.000 e ₲500.000 mora a escala ambígua (dólar digitado no campo em
  // guarani), que é METADE da praça de Ciudad del Este. Tratar aquilo como
  // isca jogaria fora dado bom — por isso a isca em guarani é só o que está
  // ABAIXO da faixa ambígua: ₲1, ₲40, ₲130 e afins.
  const isca = (ehGuarani && valor < LIMIAR_ESCALA.min) || (ehDolar && valor < FAIXA.USD.min);
  if (isca) {
    return { ok: false, motivo: "preco_isca", valorBruto: valor, moedaBruta: ehGuarani ? "PYG" : "USD" };
  }

  // ⚠️ MOEDA TROCADA NO CAMPO. Real, no WebAuto: "TOYOTA PASEO 2000 —
  // US$ 20.000.000". Ninguém vende um Paseo de 2000 por vinte milhões de
  // dólares: é valor em guarani digitado no campo de dólar. Corrigir é melhor
  // que descartar, porque o anúncio em si é legítimo — só o rótulo está errado.
  if (ehDolar && !ehGuarani && valor > TETO_DOLAR_CRIVEL) {
    if (valor >= FAIXA.PYG.min && valor <= FAIXA.PYG.max) {
      return { ok: true, valor, moeda: "PYG", corrigido: "moeda_trocada" };
    }
    return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "USD" };
  }

  if (ehGuarani) {
    if (valor > FAIXA.PYG.max) return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "PYG" };

    // ★★ ESCALA AMBÍGUA — medido no Marketplace de Ciudad del Este (24/09) e
    // é METADE da página, não exceção.
    //
    //   "₲15.500 — 2018 Chevrolet Cruze LTZ"   → ₲15.500 são treze reais.
    //                                             US$ 15.500 é o preço certo.
    //   "₲25.000 — 2002 Toyota Allion"          → aqui US$ 25.000 é caro demais;
    //                                             provavelmente são ₲25.000.000.
    //
    // O vendedor digita o número certo na escala errada, e o Facebook carimba ₲
    // porque é a moeda da praça. Os dois casos acima têm a MESMA cara e leitura
    // diferente — só o modelo e o ano desempatam, que é justamente o que a
    // tabela de referência vai saber fazer quando existir.
    //
    // Enquanto não existe: NÃO CHUTAR. Devolve o valor cru marcado como
    // ambíguo. O anúncio continua sendo capturado e fica no banco; o que ele
    // não pode é entrar na mediana carregando uma escala inventada.
    // ⚠️ Chamar isso de "isca" seria pior: isca é lixo, isto é dado bom com
    // rótulo errado — e jogar fora metade da praça mataria a tabela.
    if (valor >= LIMIAR_ESCALA.min && valor <= LIMIAR_ESCALA.max) {
      return { ok: false, motivo: "escala_ambigua", valorBruto: valor, moedaBruta: "PYG" };
    }

    // Entre a faixa ambígua e o piso do guarani (₲500 mil a ₲5 milhões) não
    // existe carro: são R$420 a R$4.200. Nem dólar digitado, nem guarani real.
    if (valor < FAIXA.PYG.min) {
      return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "PYG" };
    }

    return { ok: true, valor, moeda: "PYG" };
  }

  if (ehDolar) {
    if (valor > FAIXA.USD.max) return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "USD" };
    return { ok: true, valor, moeda: "USD" };
  }

  // Sem símbolo nenhum: a grandeza decide. Sete dígitos ou mais só faz sentido
  // em guarani; abaixo disso, só em dólar.
  if (valor >= FAIXA.PYG.min) return { ok: true, valor, moeda: "PYG" };
  if (valor >= FAIXA.USD.min && valor <= FAIXA.USD.max) return { ok: true, valor, moeda: "USD" };
  return { ok: false, motivo: "fora_de_faixa", valorBruto: valor };
}

/**
 * ★★ QUANDO O NÚMERO NÃO DIZ A MOEDA — três degraus, nesta ordem.
 *
 * Ideia do Gustavo (23/09), a partir de um "New Sorento 2026" que apareceu
 * como 30.000: *"deve ser 30.000 DÓLARES... teremos que investigar no corpo da
 * descrição menções sobre currency, e na ausência usar uma inteligência
 * pré-definida e determinística"*. É exatamente o desenho certo, porque cada
 * degrau é mais fraco que o anterior e isso precisa ficar REGISTRADO — uma
 * moeda adivinhada não pode entrar numa mediana com o mesmo peso de uma moeda
 * lida do símbolo.
 *
 *   1. SÍMBOLO no próprio preço — ₲, Gs., US$. É o que vale sempre que existe.
 *   2. PALAVRA na descrição — "30 mil dólares", "40 millones", "en guaraníes".
 *      No Paraguai se fala em "millones" o tempo todo, e isso desambigua.
 *   3. GRANDEZA — o último recurso, determinístico: preço de carro em guarani
 *      vive na casa dos milhões; em dólar, dos milhares. As faixas não se
 *      sobrepõem, e é isso que faz a regra funcionar.
 *
 * A confiança volta junto no resultado de propósito. Quem monta a tabela de
 * referência decide se aceita "grandeza" ou só símbolo — e essa decisão é
 * metade da credibilidade do produto.
 */
export type ConfiancaMoeda = "simbolo" | "descricao" | "grandeza";

/** Faixa cinzenta: alto demais para guarani de carro, alto demais para dólar. */
const ZONA_CINZENTA = { min: 500_000, max: 5_000_000 };

/**
 * ⚠️ No Paraguai, um "$" sozinho É DÓLAR. Observação do Gustavo (23/09):
 * *"muitas vezes quando se referem a dólar eles colocam somente $ ao lado ou
 * DEPOIS do número do preço"*. Não há ambiguidade local como haveria no
 * Brasil: o guarani se escreve ₲ ou Gs., nunca com cifrão. Por isso o padrão
 * cobre os dois lados — "$ 30.000" e "30.000$".
 */
const RX_DIZ_DOLAR = /(d[oó]lar|d[oó]lares|\bdolar\b|\busd\b|\bu\$s\b|verdes?\b|(?<![A-Za-z])\$\s?\d|\d\s?\$)/i;
const RX_DIZ_GUARANI = /(guaran[ií]|\bgs\b|mill[oó]n|millones|\bmil[lh][oó]es\b)/i;

export function lerPrecoComContexto(
  textoPreco: string,
  descricao = ""
): LeituraPreco & { confianca?: ConfiancaMoeda } {
  const direto = lerPreco(textoPreco);
  const ctxInicial = `${textoPreco} ${descricao}`;

  // ★★ GUARDAS DE FORMA — rodam ANTES de qualquer interpretação de moeda,
  // porque um telefone e uma entrada são números perfeitamente válidos: nenhuma
  // regra de faixa ou de símbolo vai pegá-los.
  const valorCru = numeroPY(desescapar(textoPreco));
  if (valorCru !== null && valorCru > 0) {
    // 1) celular paraguaio
    if (pareceTelefonePY(valorCru)) {
      return { ok: false, motivo: "telefone", valorBruto: valorCru, moedaBruta: "PYG" };
    }
    // 2) o valor lido é a ENTRADA que está escrita no texto
    const mA = RX_VALOR_DE_ENTRADA.exec(ctxInicial);
    const mB = RX_ENTRADA_DE_VALOR.exec(ctxInicial);
    const numEntrada = numeroPY(mA?.[1] ?? mB?.[2] ?? "");
    if (numEntrada !== null && numEntrada === valorCru) {
      return { ok: false, motivo: "entrada_financiamento", valorBruto: valorCru, moedaBruta: "PYG" };
    }
  }

  // ★★ A INTELIGÊNCIA (nome do Gustavo, 24/09): quando o ₲ carimba um número
  // que só faz sentido em dólar, a DESCRIÇÃO costuma resolver. Metade da
  // praça de Ciudad del Este cai aqui, então recuperar esses anúncios vale
  // mais que qualquer outra regra deste arquivo.
  //
  // "₲15.500" num Cruze 2018 cuja descrição diz "15.500 dólares" ou traz um
  // "$" solto deixa de ser ambíguo. Sem pista nenhuma, continua ambíguo — e
  // aí fica fora da mediana até a própria tabela poder arbitrar pelo
  // modelo/ano, que é exatamente o que ela vai saber fazer quando existir.
  if (!direto.ok && direto.motivo === "escala_ambigua") {
    const valorAmb = direto.valorBruto ?? 0;
    if (RX_DIZ_DOLAR.test(descricao) && valorAmb >= FAIXA.USD.min && valorAmb <= FAIXA.USD.max) {
      return { ok: true, valor: valorAmb, moeda: "USD", confianca: "descricao", corrigido: "moeda_trocada" };
    }
    // A descrição fala em milhões: o vendedor digitou o valor em milhares de
    // guarani ("25.000" querendo dizer ₲25.000.000).
    if (RX_DIZ_GUARANI.test(descricao) && valorAmb * 1_000 <= FAIXA.PYG.max) {
      return { ok: true, valor: valorAmb * 1_000, moeda: "PYG", confianca: "descricao", corrigido: "moeda_trocada" };
    }
    return direto;
  }

  // Teve símbolo? Então está resolvido, e com a melhor evidência possível.
  const tinhaSimbolo = RX_GUARANI.test(desescapar(textoPreco)) || RX_DOLAR.test(desescapar(textoPreco)) || RX_REAL.test(desescapar(textoPreco));
  if (tinhaSimbolo) return { ...direto, confianca: "simbolo" };

  const valor = numeroPY(desescapar(textoPreco));
  if (valor === null || valor <= 0) return direto;

  // Degrau 2: a descrição diz a moeda?
  const ctx = `${textoPreco} ${descricao}`;
  const dizDolar = RX_DIZ_DOLAR.test(ctx);
  const dizGuarani = RX_DIZ_GUARANI.test(ctx);
  if (dizDolar !== dizGuarani) {
    const moeda: MoedaPY = dizDolar ? "USD" : "PYG";
    const faixa = FAIXA[moeda];
    if (valor >= faixa.min && valor <= faixa.max) return { ok: true, valor, moeda, confianca: "descricao" };
    // A descrição diz uma coisa e a grandeza diz outra. "40 millones" com o
    // número 40 é o caso clássico: o vendedor escreveu o valor por extenso.
    //
    // ⚠️⚠️ O PISO AQUI NÃO É DETALHE — sem ele este resgate RESSUSCITA ISCA.
    //
    // Caso real, capturado em 08/10/2026: "Toyota Crown Athlete 2014" com ₲1 no
    // campo (isca clássica) e "Entrega de 36 millones" na descrição. O `/mill/`
    // casava com a palavra da ENTREGA, o ₲1 virava ₲1.000.000, e o anúncio
    // entrava no banco como um Crown de US$ 130 — a pechincha do século num
    // site cujo produto é justamente dizer quanto vale o carro.
    //
    // Checar só o teto deixa passar tudo que é pequeno demais. O resgate só faz
    // sentido quando o resultado é preço CRÍVEL de carro, então ele tem que
    // passar pelos DOIS lados da faixa: ₲40 → ₲40.000.000 entra; ₲1 → ₲1.000.000
    // não, porque ₲1 milhão não é carro em lugar nenhum.
    if (moeda === "PYG" && valor < faixa.min && /mill/i.test(ctx)) {
      const emMilhoes = valor * 1_000_000;
      if (emMilhoes >= faixa.min && emMilhoes <= faixa.max) {
        return { ok: true, valor: emMilhoes, moeda: "PYG", confianca: "descricao" };
      }
    }
  }

  // Degrau 3: grandeza. Só resolve fora da zona cinzenta.
  if (valor > ZONA_CINZENTA.max && valor <= FAIXA.PYG.max) return { ok: true, valor, moeda: "PYG", confianca: "grandeza" };

  // ⚠️⚠️ TETO MAIS APERTADO QUANDO A MOEDA É PALPITE — achado em 08/10/2026.
  //
  // A faixa de dólar vai até 500.000 porque, COM SÍMBOLO, US$ 500 mil cobre
  // qualquer coisa que se anuncie. Mas aqui a moeda não foi lida: foi deduzida
  // da grandeza. Dar a um palpite a mesma folga de uma leitura produziu isto,
  // medido na base:
  //
  //   "Chevrolet Luv 1997 Desarme 2.3"  → USD 450.000
  //   "Toyota Tercel 1997 Desarme"      → USD 450.000
  //   "Mahindra En 2010 Desarme 2.6"    → USD 350.000
  //
  // São anúncios de PEÇA (desarme = desmanche) a ₲450.000, uns US$ 60 — lidos
  // como 450 mil dólares. Erro de mil vezes, e punha uma Luv desmontada como o
  // carro mais caro do Paraguai.
  //
  // ★ Acima de US$ 150 mil, guarani é MUITO mais provável que dólar: carro de
  // US$ 150 mil no Paraguai é raridade de leilão, enquanto ₲150.000 é preço de
  // peça e aparece o tempo todo. Quando o palpite fica arriscado, recusar é a
  // resposta certa — o anúncio continua no banco sem preço, e não contamina a
  // mediana carregando uma moeda inventada.
  const TETO_DOLAR_POR_PALPITE = 150_000;
  if (valor >= FAIXA.USD.min && valor <= TETO_DOLAR_POR_PALPITE && valor < ZONA_CINZENTA.min) {
    return { ok: true, valor, moeda: "USD", confianca: "grandeza" };
  }

  // Dentro da zona cinzenta ninguém sabe. Recusar é melhor que chutar: um
  // palpite errado aqui entra na mediana e não dá sinal nenhum de que entrou.
  return { ok: false, motivo: "fora_de_faixa", valorBruto: valor };
}

/**
 * ★★★ ENTREGA NO CAMPO DE PREÇO — o maior envenenador da amostra paraguaia.
 *
 * Achado na primeira captação real (24/09): o Gustavo olhou uma "Hyundai
 * Tucson 2016 por ₲15.000.000" e disse que não fecha — uma Tucson não custa
 * R$12.700. A descrição explicou:
 *
 *   "✅ Entrega ₲ 15.000.000 ✅ Cuota ₲ 3.265.000"
 *
 * O número no campo de preço é a ENTRADA do financiamento, não o carro. E não
 * é caso isolado: **um terço da amostra** faz isso, e as revendas põem no
 * próprio TÍTULO — "20 Millones De Entrega", "Entrega Mínima 20.000.000GS",
 * "Entrega de USD 12.000 - 36 cuotas". É estratégia de busca: aparecer barato.
 *
 * Isso é pior que isca de ₲1. A isca se reconhece de longe; a entrega tem
 * valor PLAUSÍVEL de carro e entra na mediana sem levantar suspeita,
 * arrastando a referência do modelo para baixo. É exatamente o erro que
 * tornaria a nossa tabela tão pouco confiável quanto a do Carden.
 *
 * ⚠️ Vocabulário LOCAL: no Brasil é "entrada" e "parcela"; aqui é "entrega" e
 * "cuota". Traduzir o padrão brasileiro não teria pegado nada.
 */
const RX_ENTREGA = /\b(entrega|entrada)\b/i;
// ⚠️ SEM `\b` no fim — TERCEIRA vez que esse tropeço aparece neste arquivo.
// `\b(financi)\b` não casa em "FINANCIADO" nem em "Financiación", porque
// entre o "i" e a letra seguinte não existe limite de palavra. Prefixo de
// raiz nunca leva `\b` no fim.
const RX_FINANCIAMENTO = /\b(financi|cuotas?\b|refuerzos?\b|sin\s+requisitos|a\s+sola\s+c[eé]dula|informconf)/i;

/**
 * O preço anunciado é a entrega de um financiamento?
 *
 * Exige DOIS sinais: a palavra "entrega/entrada" perto de um número parecido
 * com o preço, E sinal de financiamento no texto. Só "entrega" não basta —
 * "entrega inmediata" é outra coisa e é comum.
 */
export function precoEhEntrega(descricao: string, titulo: string, preco: number): boolean {
  const t = `${titulo} ${descricao}`;
  if (!preco || !RX_ENTREGA.test(t)) return false;
  if (!RX_FINANCIAMENTO.test(t)) return false;

  // ⚠️ VARREDURA POR JANELA, e não um regex com alternação.
  // A primeira versão usava `(?:entrega)...(\d+)|(\d+)...(?:entrega)` e falhava
  // justamente no caso real: em "FINANCIADO HASTA 48 MESES ✅ Entrega ₲
  // 15.000.000", o segundo ramo casava o "48" com aquela mesma palavra
  // "Entrega" e CONSUMIA o token — então o primeiro ramo nunca chegava ao
  // 15.000.000. Alternação que compete pelo mesmo termo é armadilha; olhar a
  // vizinhança de cada ocorrência é previsível.
  const marcas = [...t.matchAll(/\b(entrega|entrada)\b/gi)];
  for (const marca of marcas) {
    const i = marca.index ?? 0;
    const janela = t.slice(Math.max(0, i - 40), i + 60);
    for (const num of janela.matchAll(/([\d][\d.,]{1,})/g)) {
      const cru = num[1].replace(/[.,]/g, "");
      const n = Number(cru);
      if (!Number.isFinite(n) || n <= 0) continue;
      // "20 millones de entrega" → o 20 vale 20.000.000
      const candidatos = /mill/i.test(janela) ? [n, n * 1_000_000] : [n];
      for (const c of candidatos) {
        if (Math.abs(c - preco) <= Math.max(1, preco * 0.05)) return true;
      }
    }
  }
  return false;
}

/**
 * ★ RESGATE: o preço DE VERDADE costuma estar escrito na descrição.
 *
 * "💰 Precio: 80.000.000 Gs", "Precio Usd 13.500", "26.500 Usd", "135 Millones".
 * Quando o campo traz a entrega, isto recupera o anúncio em vez de descartá-lo
 * — e num mercado onde só um terço tem preço limpo, recuperar importa.
 */
export function precoDeclarado(descricao: string): LeituraPreco | null {
  if (!descricao) return null;
  const t = desescapar(descricao).replace(/\+/g, " ");
  const padroes = [
    // ⚠️ O ponto NÃO pode entrar na classe de exclusão: "Precio: 80.000.000"
    // seria cortado no primeiro ponto e viraria "80".
    //
    // ⚠️⚠️ E O SEPARADOR NÃO É SÓ ":" — custou um Land Cruiser Prado 2018 em
    // 09/10/2026. O vendedor escreveu **"Precio; 85.000 dólares"**, com PONTO E
    // VÍRGULA, e o padrão antigo (`precio[:\s]*`) não casava: o ";" não estava
    // entre os separadores aceitos E ainda era excluído do trecho capturado.
    // Resultado: o anúncio entrou com o ₲1.234 do campo, que é isca.
    //
    // ★ Quem digita no celular usa o que estiver à mão — ";", "-", "=", "→".
    // Aceitar a pontuação é mais barato que perder o anúncio.
    /precio\s*[:;=\-–—>]*\s*([^\n;]{2,40})/i,
    /valor\s*[:;=\-–—>]*\s*([^\n.;]{2,40})/i,
    /(?:^|\s)(?:gs\.?|₲|us\$|usd)\s*[\d.,]{4,}/i,
    /([\d.,]{2,})\s*mill[oó]n(?:es)?/i,
  ];
  for (const rx of padroes) {
    const m = t.match(rx);
    if (!m) continue;
    const bruto = (m[1] ?? m[0]).trim();
    const trecho = primeiroValor(bruto);
    if (!trecho) continue;
    if (pareceAno(trecho)) continue;
    const r = lerPrecoComContexto(trecho, t);
    if (r.ok) return r;
  }
  return null;
}

/**
 * ★★ RECORTA O PRIMEIRO VALOR do trecho, em vez de entregar 40 caracteres.
 *
 * ⚠️ Medido numa simulação em seco de 09/10/2026 — que por sorte rodava sem
 * gravar. Três estragos, todos da mesma origem:
 *
 *   "USD 29.900 * Motor híbrido enchufable 1."  → 299.001
 *        o "1" do fim do trecho colava no número e virava outro valor
 *   "[hidden information]gs Año 2018 Motor 3."  → 2018
 *        o Facebook OCULTOU o preço e a gente pegou o ano que veio depois
 *   "gs 2014"                                    → 2.014.000
 *        o modelo se chama "Gs" e casou como se fosse "guaraníes"
 *
 * ★ A regra: do trecho sai UM token numérico, o primeiro, com a moeda que
 * estiver colada nele — e nada mais. Texto depois do número é descrição do
 * carro, não parte do preço.
 */
function primeiroValor(bruto: string): string | null {
  // ⚠️ Preço oculto pelo Facebook não é preço. Sem isto, o número seguinte na
  // frase (quase sempre o ano) toma o lugar dele.
  if (/\[hidden information\]|\[informaci[oó]n oculta\]/i.test(bruto)) return null;
  const m = bruto.match(/((?:us\$|usd|gs\.?|₲)\s*)?(\d[\d.,]{1,14})(\s*(?:gs\.?|₲|usd|d[oó]lares?|mill[oó]n(?:es)?))?/i);
  if (!m) return null;
  return [m[1], m[2], m[3]].filter(Boolean).join("").trim();
}

/**
 * ★★ O TRECHO É UM ANO DISFARÇADO DE PREÇO?
 *
 * ⚠️ Achado numa simulação em seco de 09/10/2026, que por sorte rodava sem
 * gravar: a correção em massa queria trocar o preço de um "Chevrolet S10 2023"
 * para ₲2.023.000 e de um "Mazda 2018 BT50" para ₲20.183.000. São os ANOS,
 * capturados logo depois da palavra "Precio" e lidos como valor.
 *
 * A causa foi minha: ao alargar os separadores aceitos (";", "-", "="), o
 * padrão passou a engolir até 40 caracteres depois de "Precio", e nesse pedaço
 * costuma vir "año 2023".
 *
 * ★ A regra: número de quatro dígitos na faixa de ano-modelo, SEM moeda colada,
 * é ano. Preço de carro no Paraguai ou tem sete dígitos em guarani, ou vem com
 * símbolo, ou está escrito "85.000 dólares" — nunca é um "2023" solto.
 *
 * ⚠️ Com moeda explícita o número volta a valer: "US$ 2023" é improvável, mas
 * é uma afirmação do vendedor, e não cabe a este guarda desmenti-la.
 */
function pareceAno(trecho: string): boolean {
  const limpo = trecho.trim();
  if (/\b(gs\.?|₲|guaran|us\$|usd|d[oó]lar|mill)/i.test(limpo)) return false;
  const numeros = limpo.match(/\d[\d.,]*/g) ?? [];
  if (numeros.length !== 1) return false;
  const n = Number(numeros[0].replace(/[.,]/g, ""));
  return Number.isFinite(n) && n >= 1990 && n <= 2030;
}

/**
 * ⚠️ ANÚNCIO DE COMPRA travestido de venda. Real, no ClasiPar: "COMPRO CONTADO
 * HYUNDAI TUCSON — Gs. 1" aparece na listagem de autos à venda. Não é oferta,
 * é procura — e o preço nem é preço. Tem que sair antes de qualquer média.
 */
// "permuto" saiu daqui: trocar é vender, não procurar. Ver RX_TROCA.
const RX_PROCURA = /\b(compro|compramos|busco|buscamos|necesito|se\s+busca)\b/i;

/**
 * ★ TROCA/PERMUTA **VALE** COMO VENDA — corrigido pelo Gustavo em 23/09.
 *
 * Eu tinha excluído, supondo que o número fosse a "volta" (a diferença paga
 * entre as partes). Ele conhece o mercado e desfez:
 *
 * > *"o permuta na maioria das vezes está com o preço do veículo que está
 * > sendo oferecido, não valor a colocar na volta por outro... os anunciantes
 * > gostam de destacar que além da venda têm forte interesse pela troca"*
 *
 * Ou seja: é anúncio de VENDA com abertura para troca, e o preço é o do carro.
 * Excluir jogaria fora dado bom — e num mercado onde só 3 de 10 anúncios têm
 * preço utilizável, cada um conta.
 *
 * Fica como SINAL, não como descarte: quem menciona troca costuma ser
 * particular e ter mais flexibilidade, o que pode virar informação útil na
 * tela mais para frente.
 */
// ⚠️ SEM `\b` depois de `[oó]` — é o MESMO bug de acento que já tinha me
// pegado em "único dueño": em JavaScript, `ó` não conta como caractere de
// palavra, então `/\bcambi[oó]\b/` NÃO casa em "Cambió caldina". Duas vezes o
// mesmo tropeço no mesmo arquivo; a regra é olhar com desconfiança todo `\b`
// que encoste em letra acentuada. O lookahead faz o papel da âncora sem
// depender de `\b`.
const RX_TROCA = /\bcambi[oó](?![a-zà-ú])[^.!?]{0,40}\bpor\b|\bpermut[ao]\b|\btomo\s+.{0,20}parte\s+de\s+pago\b/i;

/** Anúncio de PROCURA (quer comprar). Não é oferta — fora da média. */
export function ehAnuncioDeCompra(titulo: string, descricao = ""): boolean {
  return RX_PROCURA.test(`${titulo} ${descricao}`);
}

/**
 * Menciona troca/permuta. **Não descarta** — é só um sinal.
 * Ver o comentário de RX_TROCA: o preço anunciado é o do carro oferecido.
 */
export function mencionaTroca(titulo: string, descricao = ""): boolean {
  return RX_TROCA.test(`${titulo} ${descricao}`);
}

/**
 * ★ ISTO É IMÓVEL, NÃO CARRO — achado na vitrine em 10/10/2026.
 *
 * ⚠️ Os DOIS primeiros cards da home eram prédios de apartamento: *"Vendo
 * Loft 2027 En Encarnación"* a USD 35.000 e um anúncio de monoambientes.
 * Primeira dobra de um site de carro, com foto de fachada.
 *
 * Eles passaram porque as guardas existentes olham PREÇO (o raio) e ANO, e
 * um loft tem os dois plausíveis — inclusive o ano, que o vendedor usa para
 * o lançamento do prédio.
 *
 * ★ A guarda que faltava é a mais óbvia: nenhum carro se chama "loft" nem
 * "monoambiente". Aqui a lista de palavras É confiável, ao contrário do que
 * eu disse sobre filtros por palavra — porque o vocabulário imobiliário não
 * colide com nome de modelo em lugar nenhum.
 *
 * ⚠️ `cochera` e `garage` ficam de FORA: aparecem em anúncio de carro
 * legítimo ("siempre en cochera") e barrariam o que queremos.
 */
// ⚠️⚠️ SEM `\b` NO FIM — e esta é a QUARTA vez que o tropeço aparece neste
// arquivo. O comentário do RX_FINANCIAMENTO já avisava: prefixo de raiz nunca
// leva `\b` no fim, porque entre a última letra e o plural não existe limite de
// palavra. Com o `\b`, "MonoambienteS" passava liso — e passou, no teste.
const RX_IMOVEL =
  /\b(loft|monoambiente|departamento|apartamento|d[úu]plex|triplex|inmueble|terreno|lote baldio|local comercial|oficina|galp[óo]n|dormitorio|m2 de terreno|en construcci[óo]n)/i;

export function ehImovel(titulo: string, descricao = ""): boolean {
  // ⚠️ Título PESA mais: "departamento" no meio de uma descrição pode ser o
  // departamento de vendas da loja. No título, é o que está à venda.
  if (RX_IMOVEL.test(titulo ?? "")) return true;
  // Na descrição, exige DOIS sinais — um sozinho é coincidência.
  const achados = [...String(descricao ?? "").matchAll(new RegExp(RX_IMOVEL.source, "gi"))];
  return new Set(achados.map((m) => m[0].toLowerCase())).size >= 2;
}
/**
 * ★ CARRO PARA DESMANCHE — achado na base em 08/10/2026.
 *
 *   "Chevrolet Luv 1997 Desarme 2.3"   "Toyota Tercel 1997 Desarme"
 *   "Mahindra En 2010 Desarme 2.6"     "Chevrolet Luv 1994 Desarme 2.3"
 *
 * ⚠️ Não é carro à venda: é carro sendo VENDIDO EM PEÇAS, e o preço que aparece
 * é o de uma peça. Entrou na base como se fosse veículo inteiro e, somado ao
 * teto frouxo do palpite de moeda, virou "Luv 1997 por US$ 450.000".
 *
 * ⚠️ EXIGE NO TÍTULO: o vendedor que desmancha põe a palavra lá, porque é isso
 * que ele está oferecendo.
 *
 * ⚠️⚠️ E TRATA A NEGAÇÃO, que é o oposto exato. *"Toyota Premio 2006 impecable,
 * NO ES PARA DESARME"* é o vendedor garantindo que o carro está inteiro — e a
 * primeira versão disto barrava justamente ele. Eu tinha escrito o aviso no
 * comentário e não tinha implementado; só apareceu porque testei a frase.
 */
const RX_DESMANCHE = /\b(desarme|desarmadero|desguace|chatarra|para\s+repuestos?)\b/i;
const RX_NEGA_DESMANCHE = /\b(no|sin|nunca|jam[aá]s)\s+(es\s+)?(para\s+)?(desarm|desguace|chatarra)/i;

export function ehAnuncioDeDesmanche(titulo: string): boolean {
  const t = titulo ?? "";
  if (RX_NEGA_DESMANCHE.test(t)) return false;
  return RX_DESMANCHE.test(t);
}

/**
 * ★★ IMPORTADO vs USO LOCAL — o eixo que decide se a tabela vale alguma coisa.
 *
 * "Recién importado" (chega do Japão/Coreia pelo porto de Iquique, no Chile)
 * e "uso local" (já rodou no Paraguai, dono particular) são DUAS CURVAS DE
 * PREÇO diferentes para o mesmo modelo e o mesmo ano. Uma média que mistura as
 * duas não descreve nenhuma — e é pior que não ter tabela, porque parece
 * precisa.
 *
 * Por isso isto não é uma observação no anúncio: é campo de captura, tão
 * essencial quanto o preço.
 */
/**
 * ★★★ SÃO TRÊS POPULAÇÕES, NÃO DUAS — corrigido em 02/10/2026 com dado real.
 *
 * O desenho de setembro tinha duas curvas (importado vs uso local), copiando o
 * vocabulário local e o "Representante: Sí/No" do Carden. Abrindo um anúncio
 * de Ciudad del Este pelo navegador logado, apareceu a terceira:
 *
 *   "Corolla Cross 2026 Híbrido 0km ... 🏢 Concesionaria: Majestic Cars HVN
 *    👤 Asesor Comercial: David Lopez ... Garantía de motor y caja por 1 año"
 *
 * Isso voltava como "desconhecida". E jogar um 0km de concessionária na curva
 * de "importado" seria pior que deixar fora: um Corolla Cross zero e um usado
 * recém-chegado de Iquique não disputam o mesmo comprador nem o mesmo preço.
 * Misturados, inflam a curva do importado e fazem a tabela mentir justamente
 * no segmento mais caro.
 *
 *   zero_km    concessionária / representante oficial, carro novo
 *   importado  usado que acabou de entrar (Japão/Coreia via Iquique)
 *   uso_local  já rodou no Paraguai, normalmente de particular
 *
 * ⚠️ A tabela tem que sair segmentada nas TRÊS desde o primeiro dia. É o mesmo
 * erro do Carden, que chama de "representante" uma diferença que é de
 * quilometragem — só que ao contrário: aqui a diferença é de PRODUTO.
 */
export type Procedencia = "zero_km" | "importado" | "uso_local" | "desconhecida";

// ⚠️ SEM `\b` na frente. Em JavaScript, `\b` não enxerga letra acentuada como
// caractere de palavra: `/\b[uú]nico/` NÃO casa em " único dueño", porque
// entre o espaço e o "ú" o motor não vê limite de palavra. O teste pegou isso
// nas duas frases com "único dueño" — e seriam justamente as mais comuns num
// anúncio de particular. As expressões aqui têm duas ou três palavras, então
// não precisam da âncora para evitar falso positivo.
const RX_IMPORTADO = /(reci[eé]n\s+importad|importad[oa]s?|iquique|rec[ií]en\s+llegad|sin\s+rodar\s+en\s+py|0\s?km\s+importad)/i;
const RX_USO_LOCAL = /(uso\s+local|rodado\s+en\s+(py|paraguay)|[uú]nico\s+due[nñ]o|uso\s+n[aá]utico|chapa\s+paraguaya|con\s+uso\b)/i;

// ★ Sinais de CONCESSIONÁRIA / carro novo, colhidos do anúncio real da
// Majestic Cars HVN. "0km" sozinho basta quando não vem acompanhado de
// "importado" — a ordem no leitor abaixo cuida disso.
// ⚠️ "financio"/"cuotas" NÃO entram aqui: particular paraguaio também parcela,
// e confundir forma de pagamento com tipo de vendedor erra para o lado caro.
const RX_ZERO_KM = /(concesionari|concessionári|representante\s+oficial|asesor\s+comercial|\b0\s?km\b|cero\s+kil[oó]metro|sin\s+rodar|garant[ií]a\s+de\s+(motor|f[aá]brica)|a[nñ]o\s+modelo\s+20(2[5-9]|3\d))/i;

export function lerProcedencia(texto: string): Procedencia {
  const t = texto || "";
  const zero = RX_ZERO_KM.test(t);
  const imp = RX_IMPORTADO.test(t);
  const loc = RX_USO_LOCAL.test(t);

  // ⚠️ ORDEM: uso local vence tudo. "0km importado, único dueño" é contradição
  // de anúncio — e, diante de contradição, a curva mais BARATA é o palpite
  // seguro: errar para baixo deixa a tabela conservadora, errar para cima faz
  // ela prometer valor que o carro não tem.
  if (loc) return "uso_local";

  // "0km importado" é o importador trazendo novo: a curva que descreve isso é
  // a de importado, não a da concessionária oficial.
  if (zero && imp) return "importado";
  if (zero) return "zero_km";
  if (imp) return "importado";
  return "desconhecida";
}
