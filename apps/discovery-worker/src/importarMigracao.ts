import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * IMPORTA o backup no projeto Supabase NOVO.
 *
 * Par do `exportarParaMigracao.ts`. O schema NÃO vem daqui — vem das 86
 * migrações em `supabase/migrations/`, que são a fonte de verdade. Este script
 * só repõe o DADO.
 *
 * Uso:
 *   DESTINO_URL="postgresql://..." npx tsx src/importarMigracao.ts [pasta] [--conferir]
 *
 * ⚠️ `--conferir` roda tudo em TRANSAÇÃO e desfaz no fim: serve para ver o que
 * aconteceria sem gravar nada. Rodar isso ANTES do import de verdade é barato e
 * já pegou erro de coluna faltando em migração desatualizada.
 */

const ORIGEM = process.argv.find((a) => !a.startsWith("--") && a.includes("backup")) ?? "C:/claude/backup-autoradar";
const CONFERIR = process.argv.includes("--conferir");

/**
 * Ordem importa: tabela referenciada antes de quem a referencia.
 * `opportunities` não depende de nenhuma das outras, mas deixo por último
 * porque é a maior — se algo quebrar, quebra rápido nas pequenas.
 */
const TABELAS: { arquivo: string; tabela: string; conflito: string }[] = [
  { arquivo: "worker_config.json", tabela: "worker_config", conflito: "chave" },
  { arquivo: "cidades_coordenadas.json", tabela: "cidades_coordenadas", conflito: "" },
  { arquivo: "fb_vistos.json", tabela: "fb_vistos", conflito: "item_id" },
  { arquivo: "discovery_runs_py.json", tabela: "discovery_runs", conflito: "" },
  { arquivo: "opportunities_py.json", tabela: "opportunities", conflito: "link_origem" },
];

/** Insere em lotes: um INSERT por linha em 215 linhas é lento e barulhento. */
const LOTE = 100;

/**
 * Colunas em que dá para INSERIR.
 *
 * ⚠️ Exclui as GERADAS (`is_generated = 'ALWAYS'`): o Postgres recusa qualquer
 * valor nelas com "cannot insert a non-DEFAULT value into column". Foi o que o
 * ensaio pegou em `opportunities.data_ordenacao` — uma coluna calculada que
 * existe nos dois bancos e por isso passava pelo meu filtro de "existe no
 * destino". Existir não é o mesmo que aceitar escrita.
 *
 * ★ O valor não se perde: sendo gerada, o banco a recalcula sozinha a partir
 * das colunas de origem.
 */
async function colunasReais(c: pg.Client, tabela: string): Promise<Map<string, string>> {
  const r = await c.query(
    `select column_name, data_type from information_schema.columns
      where table_schema='public' and table_name=$1
        and coalesce(is_generated,'NEVER') <> 'ALWAYS'
        and is_updatable <> 'NO'`,
    [tabela],
  );
  return new Map(r.rows.map((x) => [x.column_name as string, x.data_type as string]));
}

/**
 * ⚠️ JSONB precisa ir como TEXTO JSON, não como objeto/array do JavaScript.
 *
 * O driver pg converte array JS em ARRAY DO POSTGRES (`{a,b}`), não em JSON —
 * e o banco recusa com "invalid input syntax for type json". Pegou em
 * `fotos_secundarias` e `atributos_olx`, que o ensaio só revelou na 5ª tabela.
 *
 * ★ Null continua null: `JSON.stringify(null)` daria a string "null", que o
 * jsonb aceitaria como valor JSON nulo — diferente de coluna vazia.
 */
function paraBanco(valor: unknown, tipo: string | undefined): unknown {
  if (valor === null || valor === undefined) return null;
  if (tipo === "jsonb" || tipo === "json") return JSON.stringify(valor);
  return valor;
}

async function main() {
  const destino = process.env.DESTINO_URL;
  if (!destino) throw new Error("falta DESTINO_URL (connection string do projeto NOVO)");

  const c = new pg.Client({ connectionString: destino, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
  await c.connect();
  if (CONFERIR) await c.query("begin");

  for (const { arquivo, tabela, conflito } of TABELAS) {
    const caminho = path.join(ORIGEM, arquivo);
    if (!fs.existsSync(caminho)) { console.log(`  — ${arquivo}: não existe, pulando`); continue; }

    const linhas = JSON.parse(fs.readFileSync(caminho, "utf8")) as Record<string, unknown>[];
    if (!linhas.length) { console.log(`  — ${tabela}: 0 linhas`); continue; }

    // ⚠️ Só manda coluna que EXISTE no destino. O schema novo pode estar à
    // frente ou atrás do antigo, e um INSERT com coluna fantasma derruba o lote
    // inteiro — melhor perder um campo que perder a tabela.
    const existentes = await colunasReais(c, tabela);
    const cols = Object.keys(linhas[0]).filter((k) => existentes.has(k));
    const ignoradas = Object.keys(linhas[0]).filter((k) => !existentes.has(k));
    if (ignoradas.length) console.log(`     ⚠️ ${tabela}: colunas sem par no destino → ${ignoradas.join(", ")}`);

    let gravadas = 0;
    for (let i = 0; i < linhas.length; i += LOTE) {
      const fatia = linhas.slice(i, i + LOTE);
      const valores: unknown[] = [];
      const grupos = fatia.map((linha, j) => {
        const marcas = cols.map((_, k) => `$${j * cols.length + k + 1}`);
        valores.push(...cols.map((col) => paraBanco(linha[col], existentes.get(col))));
        return `(${marcas.join(",")})`;
      });
      const onConflict = conflito ? `on conflict (${conflito}) do nothing` : "on conflict do nothing";
      const sql = `insert into ${tabela} (${cols.map((x) => `"${x}"`).join(",")}) values ${grupos.join(",")} ${onConflict}`;
      const r = await c.query(sql, valores);
      gravadas += r.rowCount ?? 0;
    }
    console.log(`  ✓ ${tabela}: ${gravadas} de ${linhas.length} gravadas`);
  }

  // conferência do que ficou
  console.log("\n=== no destino agora ===");
  for (const { tabela } of TABELAS) {
    try {
      const r = await c.query(`select count(*) n from ${tabela}`);
      console.log(`  ${tabela.padEnd(24)} ${r.rows[0].n}`);
    } catch (e) { console.log(`  ${tabela.padEnd(24)} ✗ ${(e as Error).message.slice(0, 60)}`); }
  }

  if (CONFERIR) {
    await c.query("rollback");
    console.log("\n⚠️ MODO CONFERÊNCIA: nada foi gravado (rollback). Rode sem --conferir para valer.");
  }
  await c.end();
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
