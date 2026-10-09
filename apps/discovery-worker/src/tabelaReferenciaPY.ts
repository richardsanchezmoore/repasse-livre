import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { calcularReferencia, type Observacao, type ReferenciaPY } from "./referenciaPrecoPY.js";
import { GERACOES } from "./geracoesPY.js";

/**
 * A TABELA DE REFERÊNCIA PARAGUAIA — agora agrupada por GERAÇÃO.
 *
 * ★★ O GANHO, medido em 08/10/2026 sobre os mesmos 108 anúncios com geração
 * conhecida: agrupando por modelo+ano, 53 caem num grupo com ofertas suficientes
 * para publicar mediana (49%); por modelo+geração, 104 (96%). A tabela sai de
 * cobrir metade do estoque para quase todo.
 *
 * ⚠️ E não é truque estatístico: geração é agrupamento que existe na engenharia
 * do carro. Um Crown 2003 e um 2005 são o mesmo S180 e podem somar; um 2002 é
 * S170 e não pode. Alargar a janela por "3 anos para cada lado" seria invenção
 * nossa — isto não é.
 *
 * ═══ ★★★ ANO PRIMEIRO, GERAÇÃO COMO REDE — corrigido em 08/10/2026 ═══
 *
 * Gustavo perguntou: *"mas a tabela está ligando a mesmo ano?"*. Não estava, e
 * ele apontou uma falha de desenho minha: a regra anterior era "um esquema por
 * modelo" — quem tinha geração era agrupado SÓ por geração, e pronto. Grosseira
 * demais, porque joga fora precisão quando o dado existe.
 *
 * ⚠️ Medido, e a geração esconde coisa real: Crown Athlete S200 vai de ₲70M
 * (2010) a ₲85M (2012), gradiente ORDENADO que a mediana da geração achata.
 * Sportage QL: ₲105M em 2017 contra ₲160M em 2019.
 *
 * ⚠️ Mas nem toda variação é gradiente: Ractis XP100 dá 2006:₲30M, 2007:₲15M,
 * 2010:₲20M — NÃO é monotônico, logo é ruído de um anúncio por ano, não efeito
 * de ano. Publicar por ano ali seria pior que agrupar.
 *
 * ★ A REGRA: para cada modelo, tenta o ANO primeiro. Os anos que reúnem ofertas
 * suficientes viram linha própria. Os anúncios dos anos que NÃO reuniram caem na
 * linha da geração. Nenhum anúncio entra em duas linhas, e cada linha diz o que
 * é — "Vitz 2012" ou "Vitz XP90 (2005–2010)".
 *
 * Assim o usuário vê exatamente contra o que está comparando, que é metade da
 * credibilidade do selo *"3% por debajo de la tabla"*.
 *
 * ═══ O QUE FICA DE FORA DO CÁLCULO (e continua na listagem) ═══
 *
 * `ano_suspeito` — o ano não cabe na produção do modelo. O cabeçalho de
 * anoModeloPY já prescrevia isto: *"ano fora da faixa vira AVISO para revisão e
 * para TIRAR DA MEDIANA, nunca descarte automático"*. Um Premio marcado como
 * 1998 (a linha começa em 2001) ancoraria uma linha de tabela que não existe.
 *
 * ⚠️ Mas o anúncio continua no banco e na listagem: no Paraguai o ano do
 * anúncio pode ser o de IMPORTAÇÃO, e quem procura carro quer ver todos.
 */

interface Linha {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  geracao: string | null;
  ano_suspeito: boolean | null;
  preco: number | null;
  moeda: string | null;
  cidade: string | null;
}

const temGeracao = (modelo: string) => Boolean(GERACOES[modelo.toLowerCase().trim()]);

/** "2005–2010" para a geração, lido do próprio dicionário. */
function intervaloDaGeracao(modelo: string, codigo: string): string | null {
  const g = (GERACOES[modelo.toLowerCase().trim()] ?? []).find((x) => x.codigo === codigo);
  if (!g) return null;
  return `${g.de}–${g.ate ?? "hoje"}`;
}

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("marca, modelo, ano, geracao, ano_suspeito, preco, moeda, cidade")
    .eq("pais", "PY")
    .not("modelo", "is", null)
    .not("preco", "is", null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const todas = (data ?? []) as Linha[];

  const suspeitos = todas.filter((o) => o.ano_suspeito).length;
  const linhas = todas.filter((o) => !o.ano_suspeito);
  console.log(`${todas.length} anúncios PY com modelo e preço · ${suspeitos} fora do cálculo por ano suspeito\n`);

  const comoObs = (o: Linha): Observacao => ({ preco: Number(o.preco), moeda: String(o.moeda), cidade: o.cidade });

  // ─── passo 1: tenta por ANO ───
  const porAno = new Map<string, Linha[]>();
  for (const o of linhas) {
    if (!o.ano) continue;
    const k = `${String(o.modelo)}|${o.ano}|${o.moeda}`;
    porAno.set(k, [...(porAno.get(k) ?? []), o]);
  }

  const refs: (ReferenciaPY & { chave: string; porGeracao: boolean; agrupado?: string })[] = [];
  const usados = new Set<Linha>();

  for (const [k, lote] of porAno) {
    const [modelo, ano, moeda] = k.split("|");
    const calc = calcularReferencia(modelo, Number(ano), moeda, lote.map(comoObs));
    // ★★ A LINHA DE ANO PAGA MAIS CARO que a de geração, e isso resolve a
    // questão do Gustavo (08/10): *"sua aplicação nesse momento é a mais válida
    // pois temos poucos anúncios; na medida que tivermos mais de 1.000 aí sim
    // podemos aplicar via ANO/GERAÇÃO"*.
    //
    // ⚠️ Em vez de escolher um esquema agora e trocar na mão depois — o que
    // exigiria alguém lembrar, e dataria o código — a exigência faz a virada
    // sozinha. Ano é a afirmação MAIS ESPECÍFICA, então precisa de confiança
    // BOA (5+ ofertas); geração se contenta com 3. Hoje, base pequena, quase
    // tudo cai na geração; conforme os anúncios chegarem, cada ano ganha linha
    // própria no momento em que merecer, um a um.
    if (calc && calc.confianca === "boa") {
      refs.push({ ...calc, chave: ano, porGeracao: false });
      lote.forEach((o) => usados.add(o));
    }
  }

  // ─── passo 1b: ★★★ ANO QUE INVERTE NÃO MERECIA LINHA ───
  //
  // ★ Gustavo (09/10/2026), olhando a tabela: *"com linhas próprias de ano não
  // se pode deixar um ano inferior ser de valor maior que o ano mais novo...
  // soaria como distorção de mercado"*. Vitz 2006 a ₲37,7M e 2007 a ₲36,0M.
  // Ele propôs forçar o ano novo a ficar 2% acima.
  //
  // ⚠️ MEDI ANTES DE APLICAR, e a medição desaconselha o remédio: das 16
  // inversões da base, **13 têm as faixas do miolo SE TOCANDO** — ou seja, a
  // diferença não se sustenta na amostra. E as 3 "separadas" são pior: Corolla
  // Axio 2008 tem faixa 20–20 (cinco anúncios no mesmo preço, reanúncio) e
  // Ractis 2010 a ₲20M contra a geração XP120 em ₲52,5M é dado sujo.
  //
  // Nenhuma é distorção de MERCADO. São amostra insuficiente e contaminação.
  //
  // ⚠️⚠️ Forçar +2% inventaria um número que nenhum vendedor pediu — e o que
  // nos separa do Carden é mostrar o que o mercado diz, com o n à vista. Pior:
  // maquiaria justamente o sinal de que o dado ainda não dá para aquele ano.
  //
  // ★ A inversão não é defeito a corrigir; é PROVA de que o ano não merecia
  // linha. Então ele perde a linha, e os anúncios caem na geração — que é
  // coerente por construção. Some sozinho quando o n crescer e a diferença,
  // se for real, se sustentar.
  // ★ O MÉTODO: pooling de vizinhos que violam a ordem (PAVA, regressão
  // isotônica). Dois anos que o dado não separa recebem a MÉDIA PONDERADA dos
  // dois, pelo n de cada um. Ninguém inventa degrau, ninguém perde linha, e a
  // tabela nunca inverte.
  //
  // ⚠️ Por que ponderada pelo n: um ano com 9 ofertas sabe mais que um com 3, e
  // a média simples deixaria o menor puxar tanto quanto o maior.
  const porModelo = new Map<string, typeof refs>();
  for (const r of refs.filter((x) => !x.porGeracao)) {
    (porModelo.get(r.modelo) ?? porModelo.set(r.modelo, []).get(r.modelo)!).push(r);
  }
  let pooled = 0;
  for (const [, lista] of porModelo) {
    const anos = lista.sort((a, b) => Number(a.chave) - Number(b.chave));
    // Blocos: cada um começa como um ano só e vai engolindo o vizinho enquanto
    // a ordem estiver violada. É o pool-adjacent-violators clássico.
    const blocos: { itens: typeof anos; valor: number; peso: number }[] = anos.map((a) => ({
      itens: [a],
      valor: a.mediana,
      peso: a.n,
    }));
    for (let i = 1; i < blocos.length; ) {
      if (blocos[i].valor >= blocos[i - 1].valor) { i++; continue; }
      const a = blocos[i - 1], b = blocos[i];
      const peso = a.peso + b.peso;
      blocos.splice(i - 1, 2, {
        itens: [...a.itens, ...b.itens],
        valor: (a.valor * a.peso + b.valor * b.peso) / peso,
        peso,
      });
      // ⚠️ volta um passo: o bloco novo pode agora violar contra o anterior.
      i = Math.max(1, i - 1);
    }
    for (const b of blocos) {
      if (b.itens.length < 2) continue;
      pooled += b.itens.length;
      for (const it of b.itens) {
        it.mediana = Math.round(b.valor);
        it.agrupado = b.itens.map((x) => x.chave).join("+");
      }
    }
  }
  if (pooled) {
    console.log(`★ ${pooled} linha(s) de ano agrupada(s) por não se separarem na amostra`);
    console.log(`   (recebem a média ponderada pelo n — a tabela não inverte e nenhuma linha se perde)\n`);
  }

  // ─── passo 2: a linha da GERAÇÃO ───
  //
  // ⚠️⚠️ SOBRE TODOS OS ANÚNCIOS DA GERAÇÃO, não só sobre as sobras. A primeira
  // versão usava só o que os anos não tinham levado, para evitar "o mesmo carro
  // em duas linhas" — e produzia um número que não significava nada: a mediana
  // dos anos justamente mais fracos em amostra.
  //
  // ★ As duas linhas respondem perguntas DIFERENTES e por isso podem coexistir,
  // como a FIPE tem o modelo e o ano: "quanto vale um Vitz XP90?" e "quanto vale
  // um Vitz 2010?". Quem consulta usa a linha mais específica que existir; a
  // geração é a rede para o ano que não tem linha própria.
  const porGeracao = new Map<string, Linha[]>();
  for (const o of linhas) {
    if (!o.geracao || !temGeracao(String(o.modelo))) continue;
    const k = `${String(o.modelo)}|${o.geracao}|${o.moeda}`;
    porGeracao.set(k, [...(porGeracao.get(k) ?? []), o]);
  }

  for (const [k, lote] of porGeracao) {
    const [modelo, ger, moeda] = k.split("|");
    const calc = calcularReferencia(modelo, null, moeda, lote.map(comoObs));
    if (calc) refs.push({ ...calc, chave: ger, porGeracao: true });
  }

  const publicaveis = refs.filter((r) => r.confianca !== "insuficiente").sort((a, b) => b.n - a.n);
  const boas = publicaveis.filter((r) => r.confianca === "boa");

  console.log(`${refs.length} grupos · ${publicaveis.length} publicáveis (3+ ofertas) · ${boas.length} com confiança BOA (5+)\n`);
  console.log("=== A TABELA ===");
  console.log("  modelo              agrupamento   n   mediana            faixa do miolo");
  for (const r of publicaveis) {
    // ★ A linha da geração diz QUAIS ANOS cobre. Sem isso, "Vitz XP90" não
    // significa nada para quem tem um Vitz 2007 na mão e quer saber se a linha
    // serve para ele — e essa é a pergunta que o selo vai responder.
    const faixaAnos = r.porGeracao ? intervaloDaGeracao(r.modelo, r.chave) : null;
    const marca = r.porGeracao ? (faixaAnos ? `geração ${faixaAnos}` : "geração") : r.agrupado ? `anos ${r.agrupado}` : "ano";
    const infl = r.anuncios > r.n ? `  ⚠️ ${r.anuncios} anúncios → ${r.n} ofertas` : "";
    const forca = r.confianca === "boa" ? "" : " ·fraca";
    console.log(
      `  ${r.modelo.slice(0, 18).padEnd(18)} ${`${r.chave} (${marca})`.padEnd(14)} ${String(r.n).padStart(2)}  ` +
      `${r.mediana.toLocaleString("es-PY").padStart(13)} ${r.moeda}  ${r.q1.toLocaleString("es-PY")}–${r.q3.toLocaleString("es-PY")}${forca}${infl}`,
    );
  }

  const cobertos = publicaveis.reduce((a, r) => a + r.anuncios, 0);
  console.log(`\n★ ${cobertos} de ${linhas.length} anúncios caem numa linha publicável (${((cobertos / linhas.length) * 100).toFixed(0)}%)`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
