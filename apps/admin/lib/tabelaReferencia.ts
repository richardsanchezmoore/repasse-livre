import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * A TABELA DE REFERÊNCIA, do lado do site.
 *
 * ★★★ É o que substitui a FIPE no Paraguai. Não achamos desconto contra uma
 * referência pronta — nós a criamos, a partir das observações de preço. Ver
 * `supabase/migrations/0093_py_tabela_referencia.sql`.
 *
 * ⚠️⚠️ LÊ A TABELA INTEIRA DE UMA VEZ E CACHEIA — nunca uma consulta por card.
 * A tabela do mês tem dezenas de linhas (36 em 10/10/2026), então cabe folgada
 * na memória; já uma listagem de 40 cards faria 40 consultas iguais, e foi
 * exatamente esse padrão que estourou o egress do Supabase em 02/10.
 *
 * ⚠️ O cache é de 30 min. A tabela só muda quando `publicarTabelaPY --gravar`
 * roda, o que acontece poucas vezes por dia.
 */

export interface LinhaReferencia {
  marca: string | null;
  modelo: string;
  escopo: "ano" | "geracao";
  chave: string;
  moeda: string;
  anos_agrupados: string | null;
  intervalo_anos: string | null;
  n: number;
  mediana: number;
  q1: number | null;
  q3: number | null;
  confianca: "boa" | "fraca";
}

/** O mês corrente como `date` (dia 1) — mesma unidade do worker. */
function mesCorrente(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function carregar(mes: string): Promise<LinhaReferencia[]> {
  const { data, error } = await supabaseAdmin
    .from("py_tabela_referencia")
    .select("marca, modelo, escopo, chave, moeda, anos_agrupados, intervalo_anos, n, mediana, q1, q3, confianca")
    .eq("mes", mes);
  // ⚠️ FALHA SILENCIOSA DE PROPÓSITO: sem tabela, o card mostra o preço e nada
  // mais. Derrubar a listagem inteira porque o selo não pôde ser calculado
  // seria trocar um enfeite por um site fora do ar.
  if (error || !data) return [];
  return data as LinhaReferencia[];
}

const carregarCache = unstable_cache(carregar, ["py-tabela-referencia"], { revalidate: 1800 });

export async function buscarTabelaReferencia(): Promise<LinhaReferencia[]> {
  return carregarCache(mesCorrente());
}

/** Índice em memória, para o card não varrer a lista inteira a cada chamada. */
export function indexarTabela(linhas: LinhaReferencia[]): Map<string, LinhaReferencia> {
  const m = new Map<string, LinhaReferencia>();
  for (const l of linhas) m.set(`${l.escopo}|${l.modelo.toLowerCase()}|${l.chave}|${l.moeda}`, l);
  return m;
}

/**
 * A linha que vale para este anúncio.
 *
 * ★★ ANO PRIMEIRO, GERAÇÃO COMO REDE — a mesma regra do cálculo. O ano é a
 * afirmação mais específica; quando ele não reuniu amostra para ter linha
 * própria, a geração responde.
 *
 * ⚠️ A MOEDA TEM QUE BATER. Comparar um anúncio em dólar com a mediana em
 * guarani exigiria converter por uma cotação que não é a do dia do anúncio —
 * e um selo errado vale menos que selo nenhum.
 */
export function linhaParaAnuncio(
  indice: Map<string, LinhaReferencia>,
  anuncio: { modelo?: string | null; geracao?: string | null; ano?: string | number | null; moeda?: string | null },
): LinhaReferencia | null {
  const modelo = String(anuncio.modelo ?? "").toLowerCase().trim();
  const moeda = String(anuncio.moeda ?? "").toUpperCase();
  if (!modelo || !moeda) return null;
  // ⚠️ `ano` chega como TEXTO do banco e nem sempre limpo ("2012", "2012/2013").
  // A chave da tabela é o ano de 4 dígitos, então extrai em vez de confiar no
  // formato — um casamento que falha em silêncio custaria o selo e ninguém veria.
  const ano = String(anuncio.ano ?? "").match(/(19|20)d{2}/)?.[0];
  if (ano) {
    const porAno = indice.get(`ano|${modelo}|${ano}|${moeda}`);
    if (porAno) return porAno;
  }
  if (anuncio.geracao) {
    const porGeracao = indice.get(`geracao|${modelo}|${anuncio.geracao}|${moeda}`);
    if (porGeracao) return porGeracao;
  }
  return null;
}

export interface PosicaoNaTabela {
  percentual: number;
  /** 'abaixo' só quando o preço fica abaixo do PRIMEIRO QUARTIL, não da mediana. */
  faixa: "abaixo" | "no_miolo" | "acima";
  linha: LinhaReferencia;
}

/**
 * Onde este preço cai na tabela.
 *
 * ★★★ O SELO QUE O GUSTAVO DESENHOU: *"3% por debajo de la tabla AutoRadarPY"*.
 *
 * ⚠️ Devolve POSIÇÃO, não veredito de "bom negócio". No Paraguai não existe
 * FIPE para dizer o que é desconto; o que sabemos afirmar é "este está abaixo
 * da mediana dos semelhantes", e essa é uma frase que se sustenta.
 *
 * ⚠️⚠️ O SELO SÓ SAI EM LINHA DE CONFIANÇA BOA (5+ ofertas). Com 3 ou 4 a
 * mediana ainda balança com um anúncio, e um selo de porcentagem sugere uma
 * precisão que o dado não tem. A linha fraca continua existindo na página da
 * tabela — lá dá para mostrar a faixa e o escopo; no card, não.
 */
export function posicaoNaTabela(
  preco: number | null | undefined,
  linha: LinhaReferencia | null,
): PosicaoNaTabela | null {
  if (!linha || preco == null || !Number.isFinite(preco) || !linha.mediana) return null;
  if (linha.confianca !== "boa") return null;
  const percentual = ((preco - linha.mediana) / linha.mediana) * 100;
  const faixa =
    linha.q1 != null && preco < linha.q1 ? "abaixo" : linha.q3 != null && preco > linha.q3 ? "acima" : "no_miolo";
  return { percentual, faixa, linha };
}
