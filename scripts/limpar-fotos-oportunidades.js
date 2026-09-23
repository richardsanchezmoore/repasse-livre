/**
 * Esvazia o bucket `oportunidades-fotos` do Supabase do Repasse Livre.
 *
 * ★ POR QUE: em 22/09/2026 o projeto foi pausado por estouro de cota, e a
 * causa NÃO era o banco (208 MB de 500 MB, folgado) — era o storage:
 * 65.399 fotos somando 4.375 MB num plano que dá 1 GB. São as fotos do
 * Facebook re-hospedadas (o fbcdn caduca, então o sistema copia 5 por
 * anúncio para um bucket próprio). Julho sozinho fez 2,9 GB.
 *
 * ⚠️ Autorizado pelo Gustavo em 22/09, escopo "só as fotos": os 21.298
 * anúncios FICAM no banco, com o histórico de preço. E nada aqui encosta em
 * Damas (`corte_*`) nem no Lar (`lar_*`), que moram no MESMO projeto e estão
 * em produção.
 *
 * ⚠️ Apagar linha de `storage.objects` por SQL NÃO apaga o arquivo — deixaria
 * órfão ocupando a cota do mesmo jeito. Por isso a remoção passa pela API de
 * storage, que é o único caminho que apaga de verdade.
 *
 * Uso:  node scripts/limpar-fotos-oportunidades.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const RAIZ = path.join(__dirname, "..");
const BUCKET = "oportunidades-fotos";
const LOTE = 500;              // remoções por chamada
const SECO = process.argv.includes("--dry");

function ler(arquivo, chave) {
  const txt = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
  const m = txt.match(new RegExp("^" + chave + '\\s*=\\s*"?([^"\\r\\n]+)"?', "m"));
  return m ? m[1].trim() : null;
}

const DB_URL = ler("apps/discovery-worker/.env", "DATABASE_URL");
const SB_URL = ler("apps/admin/.env.local", "NEXT_PUBLIC_SUPABASE_URL");
const SB_KEY = ler("apps/admin/.env.local", "SUPABASE_SERVICE_ROLE_KEY");
if (!DB_URL || !SB_URL || !SB_KEY) { console.error("faltou credencial"); process.exit(1); }

const u = new URL(DB_URL);
const pg = new Client({
  host: u.hostname, port: +u.port,
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000,
});
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const hora = () => new Date().toLocaleTimeString("pt-BR");
const mb = (b) => (Number(b || 0) / 1048576).toFixed(0) + " MB";

(async () => {
  await pg.connect();

  const antes = (await pg.query(
    "select count(*)::int n, coalesce(sum((metadata->>'size')::bigint),0)::bigint b from storage.objects where bucket_id = $1",
    [BUCKET]
  )).rows[0];
  console.log(hora(), "bucket " + BUCKET + ":", antes.n, "arquivos,", mb(antes.b));
  if (SECO) { console.log("(ensaio — nada foi apagado)"); await pg.end(); return; }
  if (!antes.n) { console.log("já está vazio."); await pg.end(); return; }

  let apagados = 0;
  let falhas = 0;

  while (true) {
    const { rows } = await pg.query(
      "select name from storage.objects where bucket_id = $1 limit $2",
      [BUCKET, LOTE]
    );
    if (!rows.length) break;

    const nomes = rows.map((r) => r.name);
    const { error } = await sb.storage.from(BUCKET).remove(nomes);
    if (error) {
      falhas++;
      console.log(hora(), "⚠️  lote falhou:", error.message);
      // Rede daqui cai bastante. Espera e tenta de novo em vez de desistir.
      if (falhas > 20) { console.log("desistindo depois de 20 falhas seguidas."); break; }
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    falhas = 0;
    apagados += nomes.length;
    if (apagados % 5000 < LOTE) {
      const pct = ((apagados / antes.n) * 100).toFixed(0);
      console.log(hora(), "…", apagados + "/" + antes.n, "(" + pct + "%)");
    }
  }

  const depois = (await pg.query(
    "select count(*)::int n, coalesce(sum((metadata->>'size')::bigint),0)::bigint b from storage.objects where bucket_id = $1",
    [BUCKET]
  )).rows[0];
  console.log("\n" + hora(), "✅ apagados", apagados, "arquivos");
  console.log(hora(), "   sobrou:", depois.n, "arquivos,", mb(depois.b));
  console.log(hora(), "   liberado:", mb(Number(antes.b) - Number(depois.b)));
  await pg.end();
})().catch((e) => { console.error("falhou:", e.message); process.exit(1); });
