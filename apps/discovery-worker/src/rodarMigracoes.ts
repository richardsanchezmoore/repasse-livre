import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Aplica as migrations de supabase/migrations/ direto no Postgres via
 * DATABASE_URL (connection string do Session Pooler — "Direct connection"
 * não resolve nessa rede, só IPv6). Substitui o fluxo manual de colar cada
 * arquivo no SQL Editor do Supabase.
 *
 * Controla o que já foi aplicado numa tabela própria (`schema_migrations`).
 * Na primeira execução, como as migrations existentes já foram aplicadas
 * manualmente ao longo do projeto, ela faz "seed" marcando todos os
 * arquivos já presentes como aplicados sem executá-los de novo — só
 * arquivos novos (criados depois desta mudança) realmente rodam.
 *
 * Uso: npm run migrar
 */
const PASTA_MIGRATIONS = join(__dirname, "..", "..", "..", "supabase", "migrations");

async function executar(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada (.env do discovery-worker).");
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        nome text primary key,
        aplicada_em timestamptz not null default now()
      )
    `);

    const arquivos = readdirSync(PASTA_MIGRATIONS)
      .filter((nome) => nome.endsWith(".sql"))
      .sort();

    const { rows: aplicadas } = await client.query<{ nome: string }>("select nome from schema_migrations");
    const jaAplicadas = new Set(aplicadas.map((linha) => linha.nome));

    // Primeira execução (tabela de controle vazia): marca tudo que já existe
    // hoje como aplicado, sem rodar de novo — essas migrations já foram
    // aplicadas manualmente no SQL Editor ao longo do projeto.
    if (jaAplicadas.size === 0 && arquivos.length > 0) {
      console.log(`[migrar] Primeira execução — marcando ${arquivos.length} migration(s) existentes como já aplicadas.`);
      for (const arquivo of arquivos) {
        await client.query("insert into schema_migrations (nome) values ($1)", [arquivo]);
      }
      console.log("[migrar] Seed concluído. Nenhuma migration nova pra rodar nesta execução.");
      return;
    }

    const pendentes = arquivos.filter((arquivo) => !jaAplicadas.has(arquivo));
    if (pendentes.length === 0) {
      console.log("[migrar] Nenhuma migration pendente.");
      return;
    }

    for (const arquivo of pendentes) {
      console.log(`[migrar] Aplicando ${arquivo}...`);
      const sql = readFileSync(join(PASTA_MIGRATIONS, arquivo), "utf-8");
      await client.query(sql);
      await client.query("insert into schema_migrations (nome) values ($1)", [arquivo]);
      console.log(`[migrar] ${arquivo} aplicada.`);
    }

    console.log(`[migrar] Resultado: ${pendentes.length} migration(s) aplicada(s).`);
  } finally {
    await client.end();
  }
}

executar().catch((erro) => {
  console.error("[migrar] Falha na execução:", erro);
  process.exitCode = 1;
});
