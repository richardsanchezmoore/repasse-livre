import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * Roda as migrações na ordem, num projeto Supabase novo.
 *
 * ⚠️ USA O SESSION POOLER (5432), não o de transação (6543): migração é DDL,
 * usa transação e estado de sessão, e o pooler de transação não garante isso.
 * O host DIRETO (db.<ref>.supabase.co) não resolve desta máquina — já sabíamos
 * do Latina, e confirmado de novo aqui.
 *
 * ★ Cada migração roda na SUA PRÓPRIA transação. Se a 47 falhar, as 46
 * anteriores ficam aplicadas e eu conserto só a que quebrou — em vez de
 * perder tudo e recomeçar às cegas.
 *
 * ★ Registra o que aplicou em `_migracoes_aplicadas`, para poder rodar de novo
 * sem repetir. Supabase tem a sua própria tabela de migração, mas ela é do CLI;
 * como estou aplicando por SQL direto, mantenho a minha.
 */
const DIR = "C:/claude/repasse-livre/supabase/migrations";
const SO_ATE = process.argv.includes("--ate") ? process.argv[process.argv.indexOf("--ate") + 1] : null;

function urlDoPooler(): string {
  const env = fs.readFileSync("C:/claude/repasse-livre/.env.novo-banco", "utf8");
  const bruta = (env.match(/^DESTINO_URL=(.*)$/m) ?? [])[1]?.trim();
  if (!bruta) throw new Error("DESTINO_URL vazia em .env.novo-banco");
  const u = new URL(bruta);
  const ref = u.hostname.match(/db\.([a-z0-9]+)\.supabase\.co/)?.[1]
    ?? u.username.split(".")[1]
    ?? "";
  if (!ref) throw new Error("não consegui achar o ref do projeto na DESTINO_URL");
  const senha = encodeURIComponent(decodeURIComponent(u.password));
  return `postgresql://postgres.${ref}:${senha}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;
}

async function main() {
  const c = new pg.Client({ connectionString: urlDoPooler(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
  await c.connect();

  await c.query(`create table if not exists _migracoes_aplicadas (
    arquivo text primary key, aplicada_em timestamptz default now())`);
  const jaFeitas = new Set(
    (await c.query(`select arquivo from _migracoes_aplicadas`)).rows.map((r) => r.arquivo as string),
  );

  const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  let ok = 0, pulou = 0;

  for (const arq of arquivos) {
    if (jaFeitas.has(arq)) { pulou++; continue; }
    if (SO_ATE && arq > SO_ATE) break;

    const sql = fs.readFileSync(path.join(DIR, arq), "utf8");
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query(`insert into _migracoes_aplicadas (arquivo) values ($1)`, [arq]);
      await c.query("commit");
      ok++;
      process.stdout.write(".");
      if (ok % 20 === 0) process.stdout.write(` ${ok}\n`);
    } catch (e) {
      await c.query("rollback").catch(() => {});
      console.log(`\n\n❌ PAROU em ${arq}`);
      console.log(`   ${(e as Error).message}`);
      console.log(`\n   ${ok} aplicadas, ${pulou} já estavam, ${arquivos.length - ok - pulou} restantes.`);
      console.log(`   As aplicadas FICAM. Conserte esta e rode de novo — ele continua de onde parou.`);
      await c.end();
      process.exitCode = 1;
      return;
    }
  }

  console.log(`\n\n✅ ${ok} migrações aplicadas · ${pulou} já estavam · ${arquivos.length} no total`);

  // ⚠️ O bucket NÃO vem de migração: a linha que o criaria está COMENTADA no
  // 0003. Sem ele a re-hospedagem de fotos falha calada na primeira captação.
  await c.query(`insert into storage.buckets (id, name, public)
                 values ('oportunidades-fotos','oportunidades-fotos', true)
                 on conflict (id) do nothing`);
  const b = await c.query(`select id, public from storage.buckets order by id`);
  console.log(`\nbuckets: ${b.rows.map((x) => `${x.id}${x.public ? " (público)" : ""}`).join(" · ")}`);

  const t = await c.query(`select count(*) n from information_schema.tables where table_schema='public'`);
  console.log(`tabelas em public: ${t.rows[0].n}`);
  await c.end();
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
