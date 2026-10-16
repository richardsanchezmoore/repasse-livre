import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { precoDeclarado } from "./precoParaguai.js";
import { geracaoDoAno } from "./geracoesPY.js";

/**
 * ★★★ PREÇO ABAIXO DO PISO — o erro que não precisa de árbitro.
 *
 * O `corrigirPrecoIncoerentePY` compara DUAS leituras e pergunta qual está
 * mais perto da referência. Este aqui resolve um caso mais simples e mais
 * grave: o preço gravado **não é preço de veículo nenhum**, em moeda nenhuma.
 * ₲75.000 é um almoço; ₲65.000 numa Suzuki GSX-R é menos que o combustível
 * do tanque. Não há o que arbitrar — um dos candidatos está desclassificado.
 *
 * ⚠️ Achado em 16/10/2026 medindo o estoque de moto: 48 anúncios da base, 42
 * deles JÁ APROVADOS e na vitrine, com preço abaixo do piso da própria moeda.
 * Num site cujo produto inteiro é dizer quanto o carro vale, é o pior lugar
 * possível para ter lixo visível.
 *
 * ★★ DUAS FAMÍLIAS, e elas pedem tratamento oposto:
 *
 *   1) MILHARES DE GUARANI — o vendedor escreveu "40.000" querendo dizer
 *      ₲40.000.000. Multiplicar por mil devolve um preço crível, e a tabela
 *      confirma. É resgate: o anúncio é bom, a leitura é que falhou.
 *
 *   2) O ANO DISFARÇADO DE PREÇO — "Geely Emgrand 2019" a ₲2.019.000, "Byd
 *      Dolphin 2024" a ₲2.024.000. O número É O ANO, e multiplicar por mil
 *      produziria ₲2 BILHÕES. Aqui não há preço a recuperar: há um campo que
 *      nunca trouxe preço. O teste é direto — `preco === ano * 1000`.
 *
 * ⚠️ O resgate (1) ainda passa pela tabela quando ela cobre o modelo: ×1000 é
 * uma hipótese, não um fato, e hipótese sem conferência foi o que encheu a
 * base de ₲450.000 lidos como US$ 450 mil.
 *
 * ⚠️⚠️ O QUE NÃO SE DECIDE AQUI: o que fazer com os que não têm conserto. Eles
 * saem listados e ficam como estão — a política de esconder ou carimbar
 * "precio a confirmar" é do Gustavo, e é a mesma pergunta dos 636 com preço
 * implausível que já está na mesa dele.
 */
const APLICAR = process.env.PY_APLICAR === "1";

/** Abaixo disto não é veículo em lugar nenhum do Paraguai. */
const PISO = { PYG_CARRO: 5_000_000, PYG_MOTO: 1_000_000, USD: 500 } as const;
const TETO_PYG = 2_000_000_000;
/**
 * ⚠️⚠️ TETO PARA O ×1000 QUANDO NÃO HÁ TABELA — e ele nasceu de um caso real
 * no primeiro seco, 16/10/2026: um "Toyota Crown Athlete 2014" a ₲1.000.000
 * ia virar **₲1.000.000.000**, uns US$ 133 mil. Sem referência do modelo,
 * nada barrava a hipótese.
 *
 * ★ É o MESMO Crown Athlete que já tinha derrubado o resgate de "millones" em
 * 08/10 — o anúncio é isca de dígito redondo, e o ₲1.000.000 do campo nunca
 * foi preço. Multiplicar isca por mil dá isca grande.
 *
 * ₲400 milhões são uns US$ 53 mil: cobre picape nova cheia e Prado de leilão,
 * que é o topo real da praça. Acima disso, sem tabela que confirme, a
 * hipótese não se sustenta sozinha.
 */
const TETO_SEM_TABELA_PYG = 400_000_000;

function mesCorrente(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const distancia = (a: number, b: number) => Math.max(a, b) / Math.min(a, b);

async function main() {
  const linhas: any[] = [];
  for (let de = 0; ; de += 1000) {
    // ⚠️ PAGINA DE 1.000 EM 1.000 — o PostgREST corta em silêncio.
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, modelo, ano, preco, moeda, categoria, status, descricao")
      .eq("pais", "PY")
      .not("preco", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const { data: tabela } = await supabase
    .from("py_tabela_referencia")
    .select("modelo, chave, moeda, mediana")
    .eq("mes", mesCorrente())
    .eq("confianca", "boa")
    .limit(1000);

  const porTabela = new Map<string, number>();
  for (const l of tabela ?? []) {
    porTabela.set(`${String(l.modelo).toLowerCase()}|${l.chave}|${l.moeda}`, Number(l.mediana));
  }
  const refDe = (modelo: string | null, ano: unknown, moeda: unknown): number | null => {
    if (!modelo) return null;
    const m = String(modelo).toLowerCase();
    const g = geracaoDoAno(m, ano == null ? null : Number(ano));
    for (const chave of [ano ? String(ano) : null, g ? g.codigo : null]) {
      if (!chave) continue;
      const v = porTabela.get(`${m}|${chave}|${moeda}`);
      if (v) return v;
    }
    return null;
  };

  const resgates: { id: string; veiculo: string; de: number; para: number; via: string; ref: number | null }[] = [];
  const anos: { id: string; veiculo: string; preco: number; status: string }[] = [];
  const semConserto: { id: string; veiculo: string; preco: number; moeda: string; status: string }[] = [];

  for (const o of linhas) {
    const p = Number(o.preco);
    const piso = o.moeda === "USD" ? PISO.USD : o.categoria === "moto" ? PISO.PYG_MOTO : PISO.PYG_CARRO;
    if (p >= piso) continue;

    // ── família 2: o ano no lugar do preço ──
    if (o.ano && p === Number(o.ano) * 1000) {
      anos.push({ id: String(o.id), veiculo: String(o.veiculo), preco: p, status: String(o.status) });
      continue;
    }

    const ref = refDe(o.modelo as string | null, o.ano, o.moeda);

    // ── candidato A: a descrição, agora que ela sabe ler "contado" ──
    const d = precoDeclarado(String(o.descricao ?? ""));
    const daDescricao = d?.ok && d.moeda === o.moeda && Number(d.valor) >= piso ? Number(d.valor) : null;

    // ── candidato B: milhares de guarani ──
    const emMilhares = o.moeda === "PYG" && p * 1000 >= piso && p * 1000 <= TETO_PYG ? p * 1000 : null;

    // ★ A descrição vem primeiro: é leitura, não hipótese. O ×1000 é palpite
    //   de forma e só entra quando não há leitura melhor.
    const candidato = daDescricao ?? emMilhares;
    const via = daDescricao ? "descrição" : "×1000";
    if (!candidato) {
      semConserto.push({ id: String(o.id), veiculo: String(o.veiculo), preco: p, moeda: String(o.moeda), status: String(o.status) });
      continue;
    }
    // ⚠️ Sem tabela, o ×1000 ainda tem de caber na praça — ver TETO_SEM_TABELA_PYG.
    const alemDoTeto = !ref && o.moeda === "PYG" && candidato > TETO_SEM_TABELA_PYG;
    if (alemDoTeto) {
      semConserto.push({ id: String(o.id), veiculo: String(o.veiculo), preco: p, moeda: String(o.moeda), status: String(o.status) });
      continue;
    }
    // ⚠️ Com tabela, o candidato tem de ser plausível. 2× é folgado de
    //   propósito: a referência é mediana de mercado e versão cheia foge dela.
    if (ref && distancia(candidato, ref) > 2) {
      semConserto.push({ id: String(o.id), veiculo: String(o.veiculo), preco: p, moeda: String(o.moeda), status: String(o.status) });
      continue;
    }
    resgates.push({ id: String(o.id), veiculo: String(o.veiculo), de: p, para: candidato, via, ref });
  }

  const f = (n: number) => n.toLocaleString("es-PY");
  console.log(`${linhas.length} com preço · ${resgates.length + anos.length + semConserto.length} ABAIXO DO PISO\n`);

  console.log(`★ ${resgates.length} com conserto:`);
  for (const r of resgates) {
    console.log(`  ${r.veiculo.slice(0, 32).padEnd(32)} ${f(r.de).padStart(11)} → ${f(r.para).padStart(13)}  via ${r.via}${r.ref ? `  (ref ${f(r.ref)})` : "  (sem tabela)"}`);
  }

  console.log(`\n⚠️ ${anos.length} em que o preço é O ANO (preço = ano × 1000) — não há preço a recuperar:`);
  for (const a of anos) console.log(`  ${a.veiculo.slice(0, 32).padEnd(32)} ${f(a.preco).padStart(11)}  [${a.status}]`);

  console.log(`\n⚠️ ${semConserto.length} sem conserto — ficam como estão, à espera da política do Gustavo:`);
  for (const s of semConserto) console.log(`  ${s.veiculo.slice(0, 32).padEnd(32)} ${s.moeda} ${f(s.preco).padStart(11)}  [${s.status}]`);

  if (!APLICAR) {
    console.log(`\n⚠️ SECO. Nada foi gravado. Para aplicar:  PY_APLICAR=1`);
    return;
  }

  let feitos = 0;
  for (const r of resgates) {
    const { error } = await supabase.from("opportunities").update({ preco: r.para }).eq("id", r.id);
    if (error) { console.log(`  ✗ ${r.id}: ${error.message.slice(0, 60)}`); continue; }
    feitos++;
  }
  console.log(`\n★ ${feitos} preço(s) resgatado(s). Os ${anos.length} com ano no lugar do preço e os ${semConserto.length} sem conserto NÃO foram tocados.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
