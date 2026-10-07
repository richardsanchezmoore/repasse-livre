import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * O VEREDITO SOBRE A ORDENAÇÃO DO MARKETPLACE.
 *
 * ★ A PERGUNTA (Gustavo, 07/10/2026): *"precisamos averiguar o mecanismo que
 * utilizávamos para identificar se alcançávamos o último visto no Facebook, para
 * saber se realmente estamos pegando anúncios frescos a cada visita ou
 * aleatórios, com o Facebook forçando 'perto de você' / 'recém anunciado'."*
 *
 * ⚠️ E a segunda, que corrige um erro meu: eu disse que três faixas "estouram o
 * teto de 24" a partir do ESTOQUE ACUMULADO em 12,8 dias. Ele respondeu que
 * nessas faixas provavelmente não alcançamos o último visto. O estoque acumulado
 * não prova isso — o que prova é `total = 24` numa busca, porque aí o Facebook
 * cortou e existe mercadoria atrás do corte. É isso que este script mede.
 *
 * ═══ AS TRÊS LEITURAS ═══
 *
 * 1. TETO BATIDO — `total >= 24` numa busca. Direto: faixa que bate o teto está
 *    escondendo estoque e precisa ser QUEBRADA.
 *
 * 2. SOBREPOSIÇÃO entre rodadas consecutivas da mesma (praça, faixa). Se ele
 *    honra `creation_time_descend`, duas rodadas a 4h de distância devolvem
 *    quase o mesmo conjunto — o mercado não gira tanto. Sobreposição baixa numa
 *    faixa que NÃO bateu o teto só tem uma explicação: ele está rotacionando o
 *    que mostra, e aí "anúncio fresco" é sorte, não método.
 *
 * 3. ESTABILIDADE DE POSIÇÃO entre os ids que aparecem nas duas rodadas. Ordem
 *    por data de criação é estável; "perto de você" embaralha. ⚠️ Esta é a mais
 *    decisiva das três, porque sobrevive a ele devolver o mesmo conjunto numa
 *    ordem diferente — caso em que a leitura 2 passaria e a verdade seria "não
 *    existe ordenação por data aqui".
 */

const TETO = 24;

/** Quantas inversões há entre duas ordens dos mesmos ids, normalizado em [0,1]. */
function concordanciaDeOrdem(a: string[], b: string[]): number | null {
  const posB = new Map(b.map((id, i) => [id, i]));
  const comuns = a.filter((id) => posB.has(id));
  if (comuns.length < 3) return null; // menos que isso não diz nada
  let concordam = 0, pares = 0;
  for (let i = 0; i < comuns.length; i++)
    for (let j = i + 1; j < comuns.length; j++) {
      pares++;
      if (posB.get(comuns[i])! < posB.get(comuns[j])!) concordam++;
    }
  return pares ? concordam / pares : null;
}

interface Busca { rodada: string; praca: string; faixa_min: number; faixa_max: number; ids: string[]; total: number }

const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(0) + "M" : (n / 1000).toFixed(0) + "k");

async function main() {
  const { data, error } = await supabase
    .from("fb_buscas")
    .select("rodada, praca, faixa_min, faixa_max, ids, total")
    .order("rodada", { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  const buscas = (data ?? []) as Busca[];

  const rodadas = [...new Set(buscas.map((b) => b.rodada))];
  console.log(`${buscas.length} busca(s) registrada(s) em ${rodadas.length} rodada(s)\n`);

  if (rodadas.length < 2) {
    console.log("⚠️ PRECISA DE PELO MENOS 2 RODADAS para comparar. Hoje há " + rodadas.length + ".");
    console.log("   A telemetria entra em vigor na próxima captação — e ela só grava de");
    console.log("   verdade com a SESSÃO DO FACEBOOK VIVA: sessão morta devolve zero em");
    console.log("   todas as faixas, e zero não distingue 'não tem carro' de 'não estou logado'.");
    if (buscas.length) analisarTeto(buscas);
    return;
  }

  analisarTeto(buscas);

  // ─── 2 e 3: só comparam a MESMA (praça, faixa) em rodadas consecutivas ───
  console.log("\n=== SOBREPOSIÇÃO E ORDEM entre rodadas consecutivas ===");
  const porChave = new Map<string, Busca[]>();
  for (const b of buscas) {
    const k = `${b.praca}|${b.faixa_min}`;
    (porChave.get(k) ?? porChave.set(k, []).get(k)!).push(b);
  }

  const sobrep: number[] = [], ordens: number[] = [];
  for (const [k, lista] of porChave) {
    for (let i = 1; i < lista.length; i++) {
      const A = lista[i - 1].ids, B = lista[i].ids;
      if (!A.length || !B.length) continue;
      const comuns = A.filter((id) => B.includes(id)).length;
      const s = comuns / Math.min(A.length, B.length);
      sobrep.push(s);
      const o = concordanciaDeOrdem(A, B);
      if (o !== null) ordens.push(o);
      if (s < 0.5) console.log(`  ⚠️ ${k.padEnd(34)} sobreposição ${(s * 100).toFixed(0)}% (${A.length}→${B.length} ids)`);
    }
  }

  const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
  const mS = media(sobrep), mO = media(ordens);
  console.log(`\n  sobreposição média: ${(mS * 100).toFixed(0)}%  (${sobrep.length} pares comparados)`);
  console.log(`  concordância de ordem: ${(mO * 100).toFixed(0)}%  (${ordens.length} pares)`);

  console.log("\n★ VEREDITO");
  if (!(mS >= 0) || !(mO >= 0)) {
    console.log("  dado insuficiente — deixa rodar mais algumas rodadas.");
  } else if (mO > 0.9 && mS > 0.7) {
    console.log("  ORDENAÇÃO HONRADA. O conjunto e a ordem se mantêm entre visitas, então");
    console.log("  o topo da busca é mesmo o mais recente e alcançamos o último visto nas");
    console.log("  faixas que não batem o teto. Nessas, faixa grossa é segura.");
  } else if (mO <= 0.9 && mS > 0.7) {
    console.log("  ⚠️ MESMO CONJUNTO, ORDEM EMBARALHADA. Ele devolve os mesmos anúncios mas");
    console.log("  não por data — então 'os 24 primeiros' NÃO são os mais recentes, e só");
    console.log("  estamos salvos porque a faixa inteira cabe nos 24. Faixa que bate o teto");
    console.log("  perde anúncio novo de forma invisível. O Gustavo estava certo.");
  } else {
    console.log("  ⚠️⚠️ ELE ROTACIONA O QUE MOSTRA. Conjunto muda entre visitas sem o teto");
    console.log("  explicar. Nesse mundo 'anúncio fresco' é sorte: a cobertura vem de");
    console.log("  insistir em faixas ESTREITAS (onde o estoque todo cabe nos 24), não de");
    console.log("  confiar na ordenação. Reduzir faixa aqui CUSTA cobertura.");
  }
}

/** Leitura 1, a direta: faixa que bate o teto esconde estoque. */
function analisarTeto(buscas: Busca[]) {
  console.log("=== TETO BATIDO (total >= 24 numa busca = há estoque atrás do corte) ===");
  const porFaixa = new Map<string, { bateu: number; total: number; max: number }>();
  for (const b of buscas) {
    const k = `${fmt(b.faixa_min)}–${fmt(b.faixa_max)}`;
    const r = porFaixa.get(k) ?? { bateu: 0, total: 0, max: 0 };
    r.total++;
    if (b.total >= TETO) r.bateu++;
    r.max = Math.max(r.max, b.total);
    porFaixa.set(k, r);
  }
  const ordenado = [...porFaixa.entries()].sort((a, b) => b[1].bateu / b[1].total - a[1].bateu / a[1].total);
  for (const [k, r] of ordenado) {
    const pct = (r.bateu / r.total) * 100;
    const veredito = r.bateu ? `  ⚠️ QUEBRAR (bateu em ${pct.toFixed(0)}% das buscas)` : r.max <= 2 ? "  · pode FUNDIR na vizinha" : "";
    console.log(`  ${k.padEnd(16)} buscas ${String(r.total).padStart(4)}  maior retorno ${String(r.max).padStart(3)}${veredito}`);
  }
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
