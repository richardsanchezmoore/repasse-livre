import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";

/**
 * RE-NORMALIZA O MODELO do que já está gravado.
 *
 * ★ Necessário porque o normalizador roda na CAPTURA: consertar o dicionário
 * não conserta o que já entrou. Em 11/10/2026 isso valia para a família Pajero
 * inteira (Junior, Mini e io gravados como "Pajero Full") e para todo Carnival,
 * gravado como a versão coreana topo de linha.
 *
 * ⚠️ Compara contra o TÍTULO original (`veiculo`), que é o que a captura viu.
 * Não re-raspa nada.
 *
 * ⚠️⚠️ NÃO MEXE em `geracao`: geração é do par modelo+ano e precisa ser
 * recalculada DEPOIS, pelo backfillGeracaoPY. Corrigir o modelo e deixar a
 * geração velha deixaria o anúncio apontando para a faixa de outro carro —
 * pior que o problema original.
 *
 * Uso:
 *   npx tsx src/renormalizarModelosPY.ts            → só mostra (seco)
 *   npx tsx src/renormalizarModelosPY.ts --aplicar  → grava
 */
const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const linhas: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, descricao, marca, modelo, geracao")
      .eq("pais", "PY")
      .not("veiculo", "is", null)
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    linhas.push(...lote);
    if (lote.length < 1000) break;
  }

  /**
   * ⚠⚠ O TÍTULO JÁ ESTÁ NORMALIZADO NO BANCO. `veiculo` guarda “Mitsubishi
   * Pajero Full 1999”, não o texto que o Facebook mostrou. Então re-normalizar
   * a partir dele NÃO recupera nada: ele já carrega o erro. O texto original
   * só sobrevive na DESCRIÇÃO.
   *
   * ★ Por isso o segundo passe lê a descrição — mas com TRAVA: só aceita a
   * correção quando o modelo novo e o antigo compartilham uma palavra, ou seja,
   * quando é troca entre IRMÃOS da mesma família (Pajero Full → Pajero Junior,
   * Land Cruiser Prado → Land Cruiser). Sem a trava, uma descrição que diz
   * “recibimos vehículos” ou cita outro carro trocaria o modelo por um
   * completamente alheio.
   *
   * ⚠️ Só os primeiros 90 caracteres: o modelo mora no começo do anúncio; o
   * resto é ficha técnica, contato e “aceitamos troca”.
   */
  // ⚠️ `/\s+/` e não `/s+/`: a barra invertida já se perdeu uma vez aqui, e o
  // efeito é traiçoeiro — `/s+/` troca a LETRA "s" por espaço, então
  // "MITSUBISHI" vira "MIT UBI HI" e o casamento falha sem erro nenhum.
  const palavras = (m: string) => new Set(m.toLowerCase().split(/\s+/).filter((p) => p.length >= 4));
  const mesmaFamilia = (a: string, b: string) => {
    const pa = palavras(a);
    for (const p of palavras(b)) if (pa.has(p)) return true;
    return false;
  };

  const mudancas: { id: string; de: string; para: string; veiculo: string; via: string }[] = [];
  for (const o of linhas) {
    const atual = o.modelo ? String(o.modelo) : null;

    // passe 1: o título (pega o que não tinha modelo nenhum)
    const r = normalizarVeiculoPY(String(o.veiculo), o.marca);
    if (r.modelo && r.modelo !== atual) {
      mudancas.push({ id: o.id, de: String(atual), para: r.modelo, veiculo: String(o.veiculo), via: "título" });
      continue;
    }

    // passe 2: a descrição, só entre irmãos
    if (!atual || !o.descricao) continue;
    const d = normalizarVeiculoPY(String(o.descricao).replace(/\s+/g, " ").slice(0, 90), o.marca);
    if (d.modelo && d.modelo !== atual && mesmaFamilia(d.modelo, atual)) {
      mudancas.push({ id: o.id, de: atual, para: d.modelo, veiculo: String(o.veiculo), via: "descrição" });
    }
  }

  const resumo = new Map<string, number>();
  for (const m of mudancas) resumo.set(`${m.de} → ${m.para}  [${m.via}]`, (resumo.get(`${m.de} → ${m.para}  [${m.via}]`) ?? 0) + 1);

  console.log(`${linhas.length} anúncios · ${mudancas.length} com modelo diferente do que o dicionário diz hoje\n`);
  [...resumo].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}x  ${k}`));

  if (!APLICAR) { console.log("\n(seco — nada mudou. Use --aplicar.)"); return; }

  const LOTE = 100;
  for (let i = 0; i < mudancas.length; i += LOTE) {
    const fatia = mudancas.slice(i, i + LOTE);
    // Agrupa por destino para não mandar uma chamada por linha.
    const porDestino = new Map<string, string[]>();
    for (const m of fatia) porDestino.set(m.para, [...(porDestino.get(m.para) ?? []), m.id]);
    for (const [para, ids] of porDestino) {
      // ⚠️ `geracao: null` junto: a geração velha é do modelo ERRADO. Fica nula
      // até o backfillGeracaoPY recalcular — nulo é honesto, errado não é.
      const { error } = await supabase.from("opportunities").update({ modelo: para, geracao: null }).in("id", ids);
      if (error) throw new Error(`gravar: ${error.message}`);
    }
  }
  console.log(`\n✓ ${mudancas.length} modelo(s) corrigido(s) · geração zerada para recálculo`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
