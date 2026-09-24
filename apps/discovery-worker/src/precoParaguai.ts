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
  | "fora_de_faixa";   // valor que não descreve carro em nenhuma das moedas

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
    if (moeda === "PYG" && valor < faixa.min && /mill/i.test(ctx)) {
      const emMilhoes = valor * 1_000_000;
      if (emMilhoes <= faixa.max) return { ok: true, valor: emMilhoes, moeda: "PYG", confianca: "descricao" };
    }
  }

  // Degrau 3: grandeza. Só resolve fora da zona cinzenta.
  if (valor > ZONA_CINZENTA.max && valor <= FAIXA.PYG.max) return { ok: true, valor, moeda: "PYG", confianca: "grandeza" };
  if (valor >= FAIXA.USD.min && valor < ZONA_CINZENTA.min) return { ok: true, valor, moeda: "USD", confianca: "grandeza" };

  // Dentro da zona cinzenta ninguém sabe. Recusar é melhor que chutar: um
  // palpite errado aqui entra na mediana e não dá sinal nenhum de que entrou.
  return { ok: false, motivo: "fora_de_faixa", valorBruto: valor };
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
export type Procedencia = "importado" | "uso_local" | "desconhecida";

// ⚠️ SEM `\b` na frente. Em JavaScript, `\b` não enxerga letra acentuada como
// caractere de palavra: `/\b[uú]nico/` NÃO casa em " único dueño", porque
// entre o espaço e o "ú" o motor não vê limite de palavra. O teste pegou isso
// nas duas frases com "único dueño" — e seriam justamente as mais comuns num
// anúncio de particular. As expressões aqui têm duas ou três palavras, então
// não precisam da âncora para evitar falso positivo.
const RX_IMPORTADO = /(reci[eé]n\s+importad|importad[oa]s?|iquique|rec[ií]en\s+llegad|sin\s+rodar\s+en\s+py|0\s?km\s+importad)/i;
const RX_USO_LOCAL = /(uso\s+local|rodado\s+en\s+(py|paraguay)|[uú]nico\s+due[nñ]o|uso\s+n[aá]utico|chapa\s+paraguaya|con\s+uso\b)/i;

export function lerProcedencia(texto: string): Procedencia {
  const t = texto || "";
  const imp = RX_IMPORTADO.test(t);
  const loc = RX_USO_LOCAL.test(t);
  // Diz os dois: "importado, único dueño" é carro importado que já teve dono
  // aqui. Na dúvida vale o uso local, que é a curva mais barata — errar para
  // baixo mantém a tabela conservadora.
  if (imp && loc) return "uso_local";
  if (imp) return "importado";
  if (loc) return "uso_local";
  return "desconhecida";
}
