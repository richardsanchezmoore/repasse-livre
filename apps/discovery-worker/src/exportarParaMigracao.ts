import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * EXPORTA O QUE IMPORTA, pelo POOLER, para migrar de projeto Supabase.
 *
 * ⚠️ POR QUE NÃO pg_dump: não está instalado nesta máquina, e instalar o
 * PostgreSQL só para isso é desproporcional. Mais importante: **o schema já
 * existe como migrações no repositório** (supabase/migrations/0001..0086). O
 * projeto novo roda as migrações e nasce idêntico — então o que falta levar é
 * só o DADO, e dado cabe em JSON.
 *
 * ⚠️ POR QUE AGORA: o projeto está restrito por `exceed_egress_quota`. A API
 * REST já caiu (o DNS do projeto nem resolve), e o pooler ainda responde — mas
 * nada garante por quanto tempo. Dado não salvo é dado em risco.
 *
 * ★ LEVA SÓ O QUE NÃO SE RECONSTRÓI:
 *   - opportunities do PARAGUAI → é a base que estamos construindo há 2 semanas;
 *   - worker_config            → praças, faixas de preço, flags. Trabalho fino;
 *   - fb_vistos                → o livro-razão: sem ele, a captação reprocessa
 *                                tudo que já viu e queima requisição no Facebook.
 *
 * ⚠️ NÃO leva as 1.540 oportunidades BRASILEIRAS: a era acabou, elas não entram
 * no produto novo, e carregá-las replicaria no projeto novo exatamente o peso
 * que estourou a cota no antigo. Ficam no backup do projeto velho, se um dia
 * precisarem.
 *
 * ⚠️ NÃO leva fipe_historico (76 mil linhas, 19 MB): é FIPE brasileira, e no
 * Paraguai não existe FIPE — é a tese do produto.
 */

const ALVO = process.argv[2] ?? "C:/claude/backup-autoradar";

const CONSULTAS: { arquivo: string; sql: string; porque: string }[] = [
  {
    arquivo: "opportunities_py.json",
    sql: `select * from opportunities where pais = 'PY' order by data_captura`,
    porque: "a base paraguaia — o ativo",
  },
  {
    arquivo: "worker_config.json",
    sql: `select * from worker_config order by chave`,
    porque: "praças, faixas, flags: trabalho fino de duas semanas",
  },
  {
    arquivo: "fb_vistos.json",
    sql: `select * from fb_vistos where visto_em >= '2026-09-20' order by visto_em`,
    porque: "livro-razão da era PY; sem ele a captação reprocessa tudo",
  },
  {
    arquivo: "cidades_coordenadas.json",
    sql: `select * from cidades_coordenadas`,
    porque: "pequena e chata de refazer",
  },
  {
    arquivo: "discovery_runs_py.json",
    sql: `select * from discovery_runs where iniciado_em >= '2026-09-20' order by iniciado_em`,
    porque: "histórico das rodadas paraguaias",
  },
];

async function main() {
  const raw = (fs.readFileSync("C:/claude/repasse-livre/apps/discovery-worker/.env", "utf8")
    .match(/DATABASE_URL=["']?([^"'\n\r]+)["']?/) ?? [])[1];
  if (!raw) throw new Error("DATABASE_URL não encontrada");

  fs.mkdirSync(ALVO, { recursive: true });
  const c = new pg.Client({ connectionString: raw, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
  await c.connect();

  const resumo: Record<string, number> = {};
  for (const { arquivo, sql, porque } of CONSULTAS) {
    try {
      const r = await c.query(sql);
      const destino = path.join(ALVO, arquivo);
      fs.writeFileSync(destino, JSON.stringify(r.rows, null, 1));
      const mb = (fs.statSync(destino).size / 1048576).toFixed(2);
      resumo[arquivo] = r.rowCount ?? 0;
      console.log(`  ✓ ${String(r.rowCount).padStart(6)} linhas · ${String(mb).padStart(6)} MB  ${arquivo}`);
      console.log(`            ${porque}`);
    } catch (e) {
      console.log(`  ✗ ${arquivo}: ${(e as Error).message}`);
    }
  }

  // ★ O schema NÃO vai em dump: vai pelas migrações, que são a fonte de verdade.
  // Guardo só a LISTA para conferência do outro lado.
  const migs = fs.readdirSync("C:/claude/repasse-livre/supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  fs.writeFileSync(path.join(ALVO, "MIGRACOES.txt"),
    `Rodar na ordem no projeto NOVO (o schema nasce daqui, não de dump):\n\n${migs.join("\n")}\n`);

  fs.writeFileSync(path.join(ALVO, "LEIA-ME.md"),
`# Backup Auto Radar PY — ${new Date().toISOString()}

Feito pelo POOLER com o projeto \`chuvlvwctwkeviencfuy\` RESTRITO por
\`exceed_egress_quota\` (a API REST já tinha caído; o pooler ainda respondia).

## Como restaurar no projeto novo
1. Rodar as migrações de \`supabase/migrations/\` na ordem (ver MIGRACOES.txt).
   O schema nasce delas — não há dump de schema aqui, de propósito.
2. Importar os JSON desta pasta nas tabelas de mesmo nome.

## O que NÃO está aqui, e por quê
- **1.540 oportunidades brasileiras**: a era acabou. Carregá-las replicaria no
  projeto novo o peso que estourou a cota no antigo.
- **fipe_historico** (76 mil linhas, 19 MB): FIPE brasileira. No Paraguai não
  existe FIPE — é a tese do produto.
- **Fotos do Storage**: ⚠️ ficam no projeto antigo. 128 fotos re-hospedadas em
  03/10 não vêm nos JSON; as URLs apontam para o bucket velho. Ver LEIA-ME.

Linhas por arquivo: ${JSON.stringify(resumo, null, 2)}
`);

  await c.end();
  console.log(`\n✅ backup em ${ALVO}`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
