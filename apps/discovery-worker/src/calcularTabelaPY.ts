import { calcularReferencia, type Observacao, type ReferenciaPY } from "./referenciaPrecoPY.js";
import { GERACOES } from "./geracoesPY.js";
import { conferirAnoModelo } from "./anoModeloPY.js";

/**
 * O CÁLCULO DA TABELA — separado do script que imprime.
 *
 * ★★ POR QUE VIROU MÓDULO: enquanto a tabela só existia dentro de um `main()`
 * que fazia `console.log`, ela não tinha como ser GRAVADA nem consultada. Era o
 * motivo real de o selo *"3% por debajo de la tabla AutoRadarPY"* nunca sair do
 * papel — ver `supabase/migrations/0093_py_tabela_referencia.sql`.
 *
 * ★★★ A FONTE É O LIVRO DE OBSERVAÇÕES, NÃO `opportunities`. Medido em
 * 10/10/2026: 1.072 observações no mês contra 990 anúncios vivos — 82 preços
 * que só existem porque o livro os guardou. Calcular de `opportunities` seria
 * deixar a tabela encolher junto com os anúncios que saem do ar, que é
 * exatamente o que `py_observacoes_preco` foi criada para impedir.
 *
 * As regras de agrupamento (ano primeiro, geração como rede, PAVA nas
 * inversões) estão documentadas em `tabelaReferenciaPY.ts` e foram só movidas
 * para cá — nenhuma mudou.
 */

/** Uma observação como ela vem do livro. */
export interface ObservacaoLivro {
  modelo: string | null;
  geracao: string | null;
  ano: number | null;
  preco: number | null;
  moeda: string | null;
  cidade: string | null;
}

export interface LinhaTabela extends ReferenciaPY {
  /** O ano ("2010") ou o código da geração ("XP90"). */
  chave: string;
  escopo: "ano" | "geracao";
  /** "2006+2007" quando o PAVA juntou anos que a amostra não separa. */
  anosAgrupados?: string;
  /** "2005–2010" — só na linha de geração. */
  intervaloAnos?: string | null;
  marca?: string | null;
}

const temGeracao = (modelo: string) => Boolean(GERACOES[modelo.toLowerCase().trim()]);

/** "2005–2010" para a geração, lido do próprio dicionário. */
export function intervaloDaGeracao(modelo: string, codigo: string): string | null {
  const g = (GERACOES[modelo.toLowerCase().trim()] ?? []).find((x) => x.codigo === codigo);
  if (!g) return null;
  return `${g.de}–${g.ate ?? "hoje"}`;
}

/**
 * ⚠️ O ano implausível sai do CÁLCULO, nunca da listagem.
 *
 * ⚠️⚠️ E só os dois problemas que acusam o ANO: `modelo_sem_faixa` devolve
 * `ok:true` e significa que o NOSSO dicionário não cobre aquele modelo — usar
 * `problema !== null` marcou 58% da base uma vez, e eu levei um tempo para
 * achar por quê.
 */
function anoImplausivel(modelo: string | null, ano: number | null): boolean {
  if (!modelo || !ano) return false;
  const c = conferirAnoModelo(modelo, ano);
  return c.problema === "antes_de_existir" || c.problema === "depois_do_fim";
}

export interface ResultadoTabela {
  linhas: LinhaTabela[];
  /** Diagnóstico, para o script imprimir e para a gente auditar. */
  total: number;
  descartadosPorAno: number;
  grupos: number;
  anosAgrupadosPorPava: number;
  anunciosCobertos: number;
}

export function calcularTabela(
  observacoes: ObservacaoLivro[],
  marcaPorModelo: Map<string, string> = new Map(),
): ResultadoTabela {
  const descartadosPorAno = observacoes.filter((o) => anoImplausivel(o.modelo, o.ano)).length;
  const base = observacoes.filter(
    (o) => o.modelo && o.preco != null && o.moeda && !anoImplausivel(o.modelo, o.ano),
  );

  const comoObs = (o: ObservacaoLivro): Observacao => ({
    preco: Number(o.preco),
    moeda: String(o.moeda),
    cidade: o.cidade,
  });

  // ─── passo 1: tenta por ANO ───
  const porAno = new Map<string, ObservacaoLivro[]>();
  for (const o of base) {
    if (!o.ano) continue;
    const k = `${String(o.modelo)}|${o.ano}|${o.moeda}`;
    porAno.set(k, [...(porAno.get(k) ?? []), o]);
  }

  const linhas: LinhaTabela[] = [];

  for (const [k, lote] of porAno) {
    const [modelo, ano, moeda] = k.split("|");
    const calc = calcularReferencia(modelo, Number(ano), moeda, lote.map(comoObs));
    // ★★ A LINHA DE ANO PAGA MAIS CARO que a de geração: ano é a afirmação mais
    // específica, então exige confiança BOA (5+); geração se contenta com 3.
    // A virada "mais dado → mais linhas de ano" acontece sozinha, sem ninguém
    // precisar lembrar de trocar um parâmetro.
    if (calc && calc.confianca === "boa") {
      linhas.push({ ...calc, chave: ano, escopo: "ano" });
    }
  }

  // ─── passo 1b: ANO QUE INVERTE NÃO MERECIA LINHA (PAVA) ───
  //
  // ⚠️ Medido: das 16 inversões da base, 13 têm as faixas do miolo SE TOCANDO —
  // a diferença não se sustenta na amostra. Forçar o ano novo a ficar acima
  // inventaria um número que nenhum vendedor pediu. Dois anos que o dado não
  // separa recebem a MÉDIA PONDERADA PELO n: ninguém inventa degrau, ninguém
  // perde linha, e a tabela nunca inverte.
  const porModelo = new Map<string, LinhaTabela[]>();
  for (const r of linhas.filter((x) => x.escopo === "ano")) {
    const atual = porModelo.get(r.modelo) ?? [];
    atual.push(r);
    porModelo.set(r.modelo, atual);
  }
  let anosAgrupadosPorPava = 0;
  for (const [, lista] of porModelo) {
    const anos = lista.sort((a, b) => Number(a.chave) - Number(b.chave));
    const blocos: { itens: LinhaTabela[]; valor: number; peso: number }[] = anos.map((a) => ({
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
      anosAgrupadosPorPava += b.itens.length;
      for (const it of b.itens) {
        it.mediana = arredondarPublicavel(b.valor, it.moeda);
        it.anosAgrupados = b.itens.map((x) => x.chave).join("+");
      }
    }
  }

  // ─── passo 2: a linha da GERAÇÃO, sobre TODOS os anúncios dela ───
  //
  // ⚠️⚠️ Não só sobre as sobras: a primeira versão usava o que os anos não
  // tinham levado e produzia a mediana dos anos justamente mais fracos em
  // amostra — um número que não correspondia a mercado nenhum.
  const porGeracao = new Map<string, ObservacaoLivro[]>();
  for (const o of base) {
    if (!o.geracao || !temGeracao(String(o.modelo))) continue;
    const k = `${String(o.modelo)}|${o.geracao}|${o.moeda}`;
    porGeracao.set(k, [...(porGeracao.get(k) ?? []), o]);
  }

  for (const [k, lote] of porGeracao) {
    const [modelo, ger, moeda] = k.split("|");
    const calc = calcularReferencia(modelo, null, moeda, lote.map(comoObs));
    if (calc) {
      linhas.push({
        ...calc,
        chave: ger,
        escopo: "geracao",
        intervaloAnos: intervaloDaGeracao(modelo, ger),
      });
    }
  }

  // ⚠️ 'insuficiente' não entra na tabela: com menos de 3 ofertas distintas a
  // mediana é o preço de alguém, não do mercado — seria o erro do Carden com
  // outro nome.
  const publicaveis = linhas
    .filter((r) => r.confianca !== "insuficiente")
    .map((r) => ({ ...r, marca: marcaPorModelo.get(r.modelo.toLowerCase().trim()) ?? null }))
    .sort((a, b) => b.n - a.n);

  return {
    linhas: publicaveis,
    total: base.length,
    descartadosPorAno,
    grupos: linhas.length,
    anosAgrupadosPorPava,
    anunciosCobertos: contarCobertos(base, publicaveis),
  };
}

/**
 * Quantos ANÚNCIOS caem em pelo menos uma linha publicável.
 *
 * ⚠⚠ CONTA ANÚNCIOS, NÃO SOMA `r.anuncios` DAS LINHAS. As linhas de ano e de
 * geração cobrem os MESMOS carros de propósito (são perguntas diferentes), então
 * somar os dois escopos daria mais "cobertos" do que anúncios existentes — e eu
 * já publiquei um número errado assim, comparando grupos de universos
 * diferentes. Aqui é um conjunto, cada anúncio conta uma vez.
 */
function contarCobertos(base: ObservacaoLivro[], linhas: LinhaTabela[]): number {
  const chaves = new Set(linhas.map((r) => `${r.escopo}|${r.modelo}|${r.chave}|${r.moeda}`));
  let n = 0;
  for (const o of base) {
    const m = String(o.modelo);
    const porAno = o.ano ? chaves.has(`ano|${m}|${o.ano}|${o.moeda}`) : false;
    const porGer = o.geracao ? chaves.has(`geracao|${m}|${o.geracao}|${o.moeda}`) : false;
    if (porAno || porGer) n++;
  }
  return n;
}

/**
 * ⚠️ SÓ A MÉDIA PONDERADA PRECISA DISTO. As medianas normais já saem redondas
 * porque são preços que alguém realmente pediu (₲52.000.000). Já o valor que o
 * PAVA calcula ao juntar dois anos cai em ₲79.166.667 — um número que denuncia
 * conta, não mercado, e numa tabela de referência isso custa credibilidade.
 *
 * ★ Arredonda para a menor unidade que o mercado usa de fato: ₲100.000 no
 * guarani (ninguém anuncia carro em dezena de milhar) e US$50 no dólar.
 * Arredondar NÃO inventa direção — não empurra o número para cima nem para
 * baixo de propósito, que era o remédio que a medição desaconselhou.
 */
function arredondarPublicavel(valor: number, moeda: string): number {
  const passo = moeda === "USD" ? 50 : 100_000;
  return Math.round(valor / passo) * passo;
}
