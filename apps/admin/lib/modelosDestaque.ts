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
  /** Como está no banco (minúsculo, normalizado) — é o valor do filtro. */
  modelo: string;
  marca: string | null;
  /** "Toyota Vitz" para a tela. */
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

function titulo(texto: string): string {
  return texto.replace(/(^|[\s-])([a-zà-ú])/g, (_, antes, letra) => antes + letra.toUpperCase());
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

async function contarModelos(): Promise<Array<{ modelo: string; marca: string | null; n: number }>> {
  const contagem = new Map<string, { marca: string | null; n: number }>();
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
      .not("modelo", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) return [];
    for (const linha of data ?? []) {
      const modelo = String(linha.modelo ?? "").trim().toLowerCase();
      if (!modelo) continue;
      const atual = contagem.get(modelo) ?? { marca: (linha.marca as string | null) ?? null, n: 0 };
      atual.n += 1;
      if (!atual.marca && linha.marca) atual.marca = linha.marca as string;
      contagem.set(modelo, atual);
    }
    if (!data || data.length < 1000) break;
    de += 1000;
  }
  return [...contagem.entries()]
    .map(([modelo, v]) => ({ modelo, marca: v.marca, n: v.n }))
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

  // Uma foto por modelo: a do anúncio mais recente que tem foto. Consulta
  // minúscula (uma coluna, uma linha) e são no máximo 14 delas por meia hora.
  const fotos = await Promise.all(
    escolhidos.map(async (c) => {
      const { data } = await supabaseAdmin
        .from("opportunities")
        .select("foto_principal")
        .eq("pais", PAIS_DO_SITE)
        .eq("status", "aprovada")
        .is("duplicata_de", null)
        .eq("modelo", c.modelo)
        .not("foto_principal", "is", null)
        .order("data_captura", { ascending: false })
        .limit(1);
      return (data?.[0]?.foto_principal as string | undefined) ?? null;
    })
  );

  return escolhidos.map((c, i) => ({
    modelo: c.modelo,
    marca: c.marca,
    rotulo: `${c.marca ? `${c.marca} ` : ""}${titulo(c.modelo)}`.trim(),
    n: c.n,
    foto: fotos[i],
    referencia: referenciaDoModelo(porModelo.get(c.modelo) ?? []),
  }));
}

const computarCache = unstable_cache(computar, ["modelos-destaque"], { revalidate: 1800 });

export async function buscarModelosDestaque(): Promise<ModeloDestaque[]> {
  return computarCache();
}
