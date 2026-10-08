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
 * ═══ UM ESQUEMA POR MODELO, NUNCA OS DOIS ═══
 *
 * ⚠️ Modelo que tem geração no dicionário é agrupado SÓ por geração; o que não
 * tem, SÓ por ano. Misturar os dois no mesmo modelo publicaria "Vitz XP90" e
 * "Vitz 2007" lado a lado, com o mesmo carro contado duas vezes e duas medianas
 * diferentes para a mesma pergunta — exatamente o tipo de coisa que destrói a
 * confiança na tabela.
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

  const grupos = new Map<string, Observacao[]>();
  const rotulo = new Map<string, { modelo: string; chave: string; moeda: string; porGeracao: boolean }>();

  for (const o of linhas) {
    const modelo = String(o.modelo);
    const porGeracao = temGeracao(modelo);
    // ⚠️ Modelo COM geração no dicionário mas sem geração nesta linha (ano
    // ausente ou fora de todas as faixas) fica de fora: encaixá-lo num grupo de
    // ano criaria o esquema misto que a tabela não pode ter.
    const sufixo = porGeracao ? o.geracao : o.ano ? String(o.ano) : null;
    if (!sufixo) continue;

    const k = `${modelo}|${sufixo}|${o.moeda}`;
    if (!grupos.has(k)) {
      grupos.set(k, []);
      rotulo.set(k, { modelo, chave: sufixo, moeda: String(o.moeda), porGeracao });
    }
    grupos.get(k)!.push({ preco: Number(o.preco), moeda: String(o.moeda), cidade: o.cidade });
  }

  const refs: (ReferenciaPY & { chave: string; porGeracao: boolean })[] = [];
  for (const [k, obs] of grupos) {
    const r = rotulo.get(k)!;
    const calc = calcularReferencia(r.modelo, null, r.moeda, obs);
    if (calc) refs.push({ ...calc, chave: r.chave, porGeracao: r.porGeracao });
  }

  const publicaveis = refs.filter((r) => r.confianca !== "insuficiente").sort((a, b) => b.n - a.n);
  const boas = publicaveis.filter((r) => r.confianca === "boa");

  console.log(`${refs.length} grupos · ${publicaveis.length} publicáveis (3+ ofertas) · ${boas.length} com confiança BOA (5+)\n`);
  console.log("=== A TABELA ===");
  console.log("  modelo              agrupamento   n   mediana            faixa do miolo");
  for (const r of publicaveis) {
    const marca = r.porGeracao ? "geração" : "ano";
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
