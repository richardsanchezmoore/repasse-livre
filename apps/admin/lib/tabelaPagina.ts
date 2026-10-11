import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import type { LinhaReferencia } from "@/lib/tabelaReferencia";

/**
 * A TABELA INTEIRA, para a página `/tabla`.
 *
 * ★★ Separado de `tabelaReferencia.ts` de propósito: lá a tabela serve ao SELO
 * do card (um índice para casar anúncio com linha); aqui ela é o PRODUTO em si,
 * navegável por Marca → Modelo → Ano. São leituras com formatos diferentes, e
 * misturar as duas faria uma carregar o peso da outra.
 *
 * ⚠️ UMA leitura por carregamento, cacheada: são dezenas de linhas, cabem na
 * memória. Consultar por marca ou por modelo faria uma ida ao banco a cada
 * clique — e a navegação é toda em memória no cliente.
 */

export interface ModeloDaTabela {
  marca: string;
  modelo: string;
  /** Linhas de ANO, ordenadas. É o que o usuário escolhe. */
  anos: LinhaReferencia[];
  /** Linhas de GERAÇÃO — a rede para o ano que não tem linha própria. */
  geracoes: LinhaReferencia[];
}

export interface TabelaCompleta {
  mes: string;
  modelos: ModeloDaTabela[];
}

function mesCorrente(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function carregar(mes: string): Promise<TabelaCompleta> {
  const { data, error } = await supabaseAdmin
    .from("py_tabela_referencia")
    .select("marca, modelo, escopo, chave, moeda, anos_agrupados, intervalo_anos, n, mediana, q1, q3, confianca")
    .eq("mes", mes)
    .order("marca")
    .order("modelo");
  // ⚠️ Falha silenciosa: sem tabela a página diz que não há tabela, em vez de
  // derrubar a rota.
  if (error || !data) return { mes, modelos: [] };

  const porModelo = new Map<string, ModeloDaTabela>();
  for (const l of data as LinhaReferencia[]) {
    // ⚠️ Linha sem marca não aparece na navegação — ela existe por Marca. Isso
    // JÁ ACONTECEU: `mapaDeMarcas` não paginava e os quatro modelos mais fortes
    // (vitz, gol, premio, ractis) saíram sem marca, inalcançáveis na página.
    if (!l.marca) continue;
    const k = `${l.marca}|${l.modelo}`;
    const m = porModelo.get(k) ?? { marca: l.marca, modelo: l.modelo, anos: [], geracoes: [] };
    (l.escopo === "ano" ? m.anos : m.geracoes).push(l);
    porModelo.set(k, m);
  }

  for (const m of porModelo.values()) {
    m.anos.sort((a, b) => Number(b.chave) - Number(a.chave));
    m.geracoes.sort((a, b) => String(b.intervalo_anos ?? "").localeCompare(String(a.intervalo_anos ?? "")));
  }

  return {
    mes,
    modelos: [...porModelo.values()].sort(
      (a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo),
    ),
  };
}

const carregarCache = unstable_cache(carregar, ["py-tabela-pagina"], { revalidate: 1800 });

export async function buscarTabelaCompleta(): Promise<TabelaCompleta> {
  return carregarCache(mesCorrente());
}

/**
 * Os anos que a página oferece para um modelo.
 *
 * ★★★ A DECISÃO DO GUSTAVO: *"o usuário irá selecionar Marca/Modelo/Ano...
 * devemos manter separados a seleção"*. Ou seja: mesmo quando a referência é
 * agrupada (dois anos que a amostra não separa, ou a linha da geração), o ANO
 * continua sendo escolhido um a um.
 *
 * ⚠️ Por isso a lista de anos NÃO é a lista de linhas: a geração 2005–2010 vira
 * seis anos escolhíveis, todos apontando para a mesma linha. Quem tem um Vitz
 * 2008 na mão procura "2008", não "XP90" — e não saber o código da geração não
 * pode ser motivo para não achar o preço.
 */
export function anosOferecidos(m: ModeloDaTabela): { ano: number; linha: LinhaReferencia }[] {
  const mapa = new Map<number, LinhaReferencia>();

  // ★ Geração primeiro: ela cobre a faixa inteira. O ano com linha própria
  // sobrescreve depois, porque é a afirmação mais específica.
  for (const g of m.geracoes) {
    const faixa = String(g.intervalo_anos ?? "");
    const [de, ate] = faixa.split("–");
    const ini = Number(de);
    // "2010–hoje" → até o ano corrente.
    const fim = /^\d{4}$/.test(String(ate)) ? Number(ate) : new Date().getUTCFullYear();
    if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim < ini) continue;
    // ⚠️ Teto defensivo: faixa maluca no dicionário não pode gerar mil linhas.
    for (let a = ini; a <= Math.min(fim, ini + 40); a++) mapa.set(a, g);
  }
  for (const a of m.anos) {
    const n = Number(a.chave);
    if (Number.isFinite(n)) mapa.set(n, a);
  }

  return [...mapa.entries()].sort((x, y) => y[0] - x[0]).map(([ano, linha]) => ({ ano, linha }));
}
