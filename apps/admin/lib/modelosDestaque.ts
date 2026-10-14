import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { PAIS_DO_SITE } from "@/lib/site";
import { buscarTabelaReferencia, type LinhaReferencia } from "@/lib/tabelaReferencia";

/**
 * ═══ "EXPLORÁ POR MODELO" — os modelos que a nossa base realmente tem ═══
 *
 * ★★ A IDEIA É DO GUSTAVO (12/10/2026): uma fileira horizontal de modelos logo
 * abaixo dos KPI, para entrar direto no carro em vez de preencher filtro.
 *
 * ★★★ MAS A LISTA SAI DO DADO, NUNCA DE PALPITE. A sugestão que chegou junto
 * (Corolla, Hilux, Tucson, Picanto, Onix, BYD Dolphin, Nissan Note) é a lista
 * de carro NOVO do Mercosul, e o Paraguai usado não é isso. Medido na base em
 * 12/10: Picanto ZERO anúncios, Dolphin 1, Note 13, Corolla 19 — enquanto Vitz
 * tem 82, Morning 61, Tracker 53, Sportage 52. Publicar a lista de palpite
 * mostraria vitrine vazia no clique, que é o pior erro possível numa seção de
 * descoberta.
 *
 * ⚠️ POR ISSO O CORTE É POR CONTAGEM VIVA, recalculada a cada 30 min. A ordem
 * se corrige sozinha conforme a varredura anda.
 *
 * ⚠️⚠️ CUSTO: lê `modelo, marca` de TODOS os vivos (≈3,3 mil linhas, duas
 * colunas curtas) uma vez a cada 30 min, e só então uma consulta minúscula por
 * modelo escolhido para pegar a foto. O caminho ingênuo — uma consulta por
 * card com a linha inteira — é exatamente o padrão que estourou o egress do
 * Supabase em 02/10.
 */

export interface ModeloDestaque {
  /**
   * Minúsculo — é o que vai na URL (`?modelo=vitz`).
   *
   * ⚠️⚠️ O BANCO GRAVA COM INICIAL MAIÚSCULA ("Vitz", "Land Cruiser"), e eu
   * assumi minúsculo porque o meu próprio diagnóstico imprimia minúsculo — era
   * o SCRIPT que baixava a caixa, não a coluna. Resultado: `eq("modelo","vitz")`
   * devolvia ZERO, as fotos sumiram e o clique levava a vitrine vazia. Por isso
   * toda consulta por modelo usa `ilike` SEM curinga (igualdade insensível à
   * caixa), nunca `eq`.
   */
  modelo: string;
  marca: string | null;
  /** "Toyota Vitz" para a tela — a grafia do banco, não um title-case meu. */
  rotulo: string;
  /** Anúncios vivos (não reanúncio) deste modelo. */
  n: number;
  foto: string | null;
  /** Faixa das medianas publicadas na tabela — null quando o modelo ainda não tem referência. */
  referencia: { moeda: string; min: number; max: number; anoMin: number; anoMax: number } | null;
}

const QUANTOS = 14;
/** ⚠️ Abaixo disso o clique leva a uma vitrine de três carros — parece site vazio. */
const MINIMO_ANUNCIOS = 12;

/**
 * ⚠️ `%` e `_` são curingas no `ilike`. Nome de modelo não costuma ter nenhum
 * dos dois, mas um dia terá, e aí o filtro casaria com meio catálogo em
 * silêncio.
 */
function escaparIlike(valor: string): string {
  return valor.replace(/[%_\\]/g, (c) => "\\" + c);
}

/** Anos citados numa linha da tabela ("2011", "2011+2012", "2006–2012"). */
function anosDaLinha(l: LinhaReferencia): number[] {
  const texto = `${l.chave ?? ""} ${l.anos_agrupados ?? ""} ${l.intervalo_anos ?? ""}`;
  return [...texto.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

/**
 * ⚠️ MOEDA ÚNICA POR MODELO. A tabela tem linhas em guarani e em dólar para o
 * mesmo carro (é assim que o mercado anuncia), e juntar as duas numa faixa só
 * daria "₲17.000.000–28.500" — número sem sentido. Fica a moeda com MAIS
 * linhas; empate vai para o guarani, que é a moeda da praça.
 */
function referenciaDoModelo(linhas: LinhaReferencia[]): ModeloDestaque["referencia"] {
  if (!linhas.length) return null;
  const porMoeda = new Map<string, LinhaReferencia[]>();
  for (const l of linhas) {
    const arr = porMoeda.get(l.moeda) ?? [];
    arr.push(l);
    porMoeda.set(l.moeda, arr);
  }
  const [moeda, doModelo] = [...porMoeda.entries()].sort(
    (a, b) => b[1].length - a[1].length || (a[0] === "PYG" ? -1 : 1)
  )[0];

  const medianas = doModelo.map((l) => Number(l.mediana)).filter((n) => Number.isFinite(n) && n > 0);
  if (!medianas.length) return null;
  const anos = doModelo.flatMap(anosDaLinha);
  return {
    moeda,
    min: Math.min(...medianas),
    max: Math.max(...medianas),
    anoMin: anos.length ? Math.min(...anos) : 0,
    anoMax: anos.length ? Math.max(...anos) : 0,
  };
}

async function contarModelos(): Promise<Array<{ modelo: string; grafia: string; marca: string | null; n: number }>> {
  // chave minúscula → grafia do banco + marca + contagem
  const contagem = new Map<string, { grafia: string; marca: string | null; n: number }>();
  let de = 0;
  for (;;) {
    // ⚠️⚠️ PAGINA DE 1.000 EM 1.000. `.limit(5000)` NÃO vence o teto do
    // PostgREST — ele devolve 1.000 em silêncio, sem erro. Essa armadilha já
    // custou três diagnósticos errados neste projeto.
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select("modelo, marca")
      .eq("pais", PAIS_DO_SITE)
      .eq("status", "aprovada")
      .is("duplicata_de", null)
      // ⚠️⚠️ AS MESMAS TRÊS CONDIÇÕES DA VITRINE (ver DiscoveriesBoard): sem
      // reanúncio, com foto e com cidade. A primeira versão contava só os
      // vivos e o cartão prometia "82 avisos" enquanto a listagem entregava
      // 62 — número do cartão tem de ser o número da página de destino, senão
      // o próprio recurso desmente o site.
      .not("foto_principal", "is", null)
      .not("cidade", "is", null)
      .not("modelo", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) return [];
    for (const linha of data ?? []) {
      const grafia = String(linha.modelo ?? "").trim();
      const chave = grafia.toLowerCase();
      if (!chave) continue;
      const atual = contagem.get(chave) ?? { grafia, marca: (linha.marca as string | null) ?? null, n: 0 };
      atual.n += 1;
      if (!atual.marca && linha.marca) atual.marca = linha.marca as string;
      contagem.set(chave, atual);
    }
    if (!data || data.length < 1000) break;
    de += 1000;
  }
  return [...contagem.entries()]
    .map(([modelo, v]) => ({ modelo, grafia: v.grafia, marca: v.marca, n: v.n }))
    .sort((a, b) => b.n - a.n);
}

async function computar(): Promise<ModeloDestaque[]> {
  const [contagens, tabela] = await Promise.all([contarModelos(), buscarTabelaReferencia()]);
  const escolhidos = contagens.filter((c) => c.n >= MINIMO_ANUNCIOS).slice(0, QUANTOS);
  if (!escolhidos.length) return [];

  const porModelo = new Map<string, LinhaReferencia[]>();
  for (const l of tabela) {
    const k = String(l.modelo ?? "").toLowerCase();
    const arr = porModelo.get(k) ?? [];
    arr.push(l);
    porModelo.set(k, arr);
  }

  /**
   * Uma foto por modelo: a do anúncio mais recente que tem foto. Consulta
   * minúscula (uma coluna, uma linha) e são no máximo 14 delas por meia hora.
   *
   * ⚠️⚠️ PREFERE A FOTO RE-HOSPEDADA NO NOSSO BUCKET. A URL do fbcdn traz um
   * `oe=` que CADUCA e vira 403 em poucos dias — e aqui o estrago seria pior
   * que num card: a fileira fica no alto da home, e cartão com buraco no lugar
   * da foto é a primeira coisa que o visitante vê. Hoje 78% das fotos recentes
   * ainda são fbcdn (o re-hospedador não alcançou), então a volta por cima
   * existe: sem nenhuma re-hospedada, aceita a do Facebook em vez de deixar o
   * cartão cego.
   */
  const buscarFoto = async (modelo: string, soNosso: boolean) => {
    // ⚠️ A cadeia sai inteira dos dois lados do ternário em vez de reatribuir
    // `q`: reatribuir um builder do supabase-js estoura o TS2589 ("type
    // instantiation is excessively deep") — o tipo cresce a cada filtro.
    const base = supabaseAdmin
      .from("opportunities")
      .select("foto_principal")
      .eq("pais", PAIS_DO_SITE)
      .eq("status", "aprovada")
      .is("duplicata_de", null)
      .ilike("modelo", escaparIlike(modelo))
      .not("foto_principal", "is", null)
      .not("cidade", "is", null);
    const { data } = soNosso
      ? await base.not("foto_principal", "ilike", "%fbcdn%").order("data_captura", { ascending: false }).limit(1)
      : await base.order("data_captura", { ascending: false }).limit(1);
    return (data?.[0]?.foto_principal as string | undefined) ?? null;
  };

  const fotos = await Promise.all(
    escolhidos.map(async (c) => {
      return (await buscarFoto(c.modelo, true)) ?? (await buscarFoto(c.modelo, false));
    })
  );

  return escolhidos.map((c, i) => ({
    modelo: c.modelo,
    marca: c.marca,
    rotulo: `${c.marca ? `${c.marca} ` : ""}${c.grafia}`.trim(),
    n: c.n,
    foto: fotos[i],
    referencia: referenciaDoModelo(porModelo.get(c.modelo) ?? []),
  }));
}

const computarCache = unstable_cache(computar, ["modelos-destaque"], { revalidate: 1800 });

export async function buscarModelosDestaque(): Promise<ModeloDestaque[]> {
  return computarCache();
}

/**
 * ★★ O MODELO COMO CAMINHO, não como parâmetro de busca.
 *
 * ⚠️ Pedido do Gustavo (14/10/2026): *"devemos corrigir o slug da página
 * modelo, pois está `?modelo=sportage`"*. E ele tem razão por um motivo que vai
 * além da estética: `?modelo=` é um FILTRO — o Google trata como variação da
 * home e não indexa como página própria. Uma página por modelo é exatamente o
 * tipo de conteúdo que o produto tem de sobra (foto, n, faixa de preço, anos) e
 * que hoje não existe para o buscador.
 *
 * ⚠️ O slug não pode ser reversível por `replace("-", " ")`: "corolla-runx"
 * voltaria como "corolla runx" (certo), mas "hr-v" voltaria como "hr v"
 * (errado). Por isso a volta é por BUSCA na lista, não por transformação.
 */
export function slugDoModelo(modelo: string): string {
  return modelo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Devolve o modelo canônico de um slug, ou null quando não existe. */
export async function modeloPorSlug(slug: string): Promise<ModeloDestaque | null> {
  const alvo = slugDoModelo(String(slug ?? ""));
  if (!alvo) return null;
  const modelos = await buscarModelosDestaque();
  return modelos.find((m) => slugDoModelo(m.modelo) === alvo) ?? null;
}
