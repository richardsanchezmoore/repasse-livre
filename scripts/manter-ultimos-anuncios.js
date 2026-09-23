/**
 * Retenção por QUANTIDADE: mantém os N anúncios mais recentes e apaga o resto.
 *
 * ★ POR QUE NÃO POR TEMPO (decisão do Gustavo, 23/09/2026):
 * a ideia original era apagar o que passasse de 90 dias. Só que a captação
 * está praticamente parada desde agosto — uma limpeza por tempo esvaziaria o
 * site inteiro. E ele QUER o site com cara de site: o projeto vai pivotar para
 * captação no Paraguai, e ter algumas centenas de anúncios na tela é o que
 * permite entender o funcionamento enquanto o novo motor é construído.
 *
 * Por quantidade o comportamento é estável independente do ritmo de captura:
 * sempre sobram os N mais recentes, tenha havido captura ontem ou em julho.
 *
 * ⚠️ Nada aqui encosta em Damas (`corte_*`) nem no Lar (`lar_*`), que moram no
 * MESMO projeto Supabase e estão em produção.
 *
 * As tabelas dependentes se resolvem sozinhas: `favoritos` e `alertas_enviados`
 * têm ON DELETE CASCADE, `eventos_analytics` tem SET NULL. O histórico de preço
 * (`oportunidades_historico`, `anuncio_preco_log`) não tem FK, então os órfãos
 * são limpos aqui explicitamente.
 *
 * ★★ POR FONTE, não no bolo (achado no ensaio de 23/09): guardar "os 500 mais
 * recentes" no geral deixaria só OLX (344) e Webmotors (156) — Facebook e
 * Mercado Livre sumiriam inteiros, porque pararam de capturar antes. E são
 * justamente OS DOIS QUE IMPORTAM NO PARAGUAI, as únicas fontes que existem
 * lá. Guardar uma amostra de cada fonte é o que preserva a tela representativa
 * do que o motor faz — que é o motivo da limpeza ser parcial e não total.
 *
 * Uso:  node scripts/manter-ultimos-anuncios.js [quantos] [--dry] [--no-fonte]
 *       node scripts/manter-ultimos-anuncios.js 500          (125 por fonte)
 *       node scripts/manter-ultimos-anuncios.js 500 --no-fonte  (500 no bolo)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const RAIZ = path.join(__dirname, "..");
const MANTER = Number(process.argv.find((a) => /^\d+$/.test(a)) || 500);
const SECO = process.argv.includes("--dry");
const POR_FONTE = !process.argv.includes("--no-fonte");
const LOTE = 1000;

const raw = (fs.readFileSync(path.join(RAIZ, "apps/discovery-worker/.env"), "utf8")
  .match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/) || [])[1];
if (!raw) { console.error("faltou DATABASE_URL"); process.exit(1); }
const u = new URL(raw);
const c = new Client({
  host: u.hostname, port: +u.port,
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000,
});

const hora = () => new Date().toLocaleTimeString("pt-BR");

(async () => {
  await c.connect();
  const q = async (s, p) => (await c.query(s, p)).rows;

  const total = Number((await q("select count(*)::int n from public.opportunities"))[0].n);
  const sobra = Math.max(0, total - MANTER);
  console.log(hora(), "anúncios:", total, "| manter:", MANTER, "| a apagar:", sobra);

  if (!sobra) { console.log("nada a fazer."); await c.end(); return; }

  // ★★ PESO POR FONTE. Dividir igualmente entre as quatro seria tratar OLX e
  // Webmotors como se fossem continuar existindo — e o Gustavo lembrou em
  // 23/09: **não existe OLX no Paraguai**, nem Webmotors. As únicas fontes de
  // lá são Facebook Marketplace e Mercado Livre.
  // Então a amostra que fica é enviesada de propósito PARA O FUTURO: o dobro
  // das duas que vão operar, e um resto pequeno das duas que só servem como
  // lembrete de como o motor lida com outro formato de anúncio.
  const PESO = { FACEBOOK: 2, MERCADO_LIVRE: 2, OLX: 0.5, WEBMOTORS: 0.5 };
  const fontes = (await q("select distinct fonte from public.opportunities where fonte is not null")).map((x) => x.fonte);
  const somaPesos = fontes.reduce((s, f) => s + (PESO[f] ?? 1), 0);
  const cotaDe = (f) => Math.max(1, Math.round((MANTER * (PESO[f] ?? 1)) / somaPesos));
  const porFonte = POR_FONTE ? cotaDe : null;
  if (POR_FONTE) {
    console.log(hora(), "   modo POR FONTE, com peso (FB e ML valem 4x OLX/Webmotors):");
    fontes.forEach((f) => console.log("            cota:", String(f).padEnd(16), cotaDe(f)));
  }

  // A cota é diferente por fonte, então o SQL recebe a lista de pares.
  const pares = fontes.map((f) => [f, POR_FONTE ? cotaDe(f) : MANTER]);
  const ficam = await q(
    POR_FONTE
      ? `select x.fonte, count(*) n from (
           select o.fonte, row_number() over (partition by o.fonte order by o.data_captura desc) rn
             from public.opportunities o
         ) x
         join (values ${pares.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}::int)`).join(",")}) as c(fonte, cota)
           on c.fonte = x.fonte
         where x.rn <= c.cota
         group by x.fonte order by 2 desc`
      : `select fonte, count(*) n from (
           select fonte from public.opportunities order by data_captura desc limit $1
         ) x group by fonte order by 2 desc`,
    POR_FONTE ? pares.flat() : [MANTER]
  );
  ficam.forEach((r) => console.log("            fica:", String(r.fonte).padEnd(16), r.n));
  console.log(hora(), "   total que fica:", ficam.reduce((s, r) => s + Number(r.n), 0));

  if (SECO) { console.log("\n(ensaio — nada foi apagado)"); await c.end(); return; }

  // Apaga em lotes: uma única transação de 20 mil linhas trava a tabela e, num
  // plano free com IO limitado, é exatamente o tipo de operação que derrubou o
  // site em 13/08.
  let apagados = 0;
  while (true) {
    const { rowCount } = await c.query(
      POR_FONTE
        ? `delete from public.opportunities
            where id in (
              select x.id from (
                select o.id, o.fonte,
                       row_number() over (partition by o.fonte order by o.data_captura desc) rn
                  from public.opportunities o
              ) x
              left join (values ${pares.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}::int)`).join(",")}) as c(fonte, cota)
                on c.fonte = x.fonte
              where x.rn > coalesce(c.cota, 0)
              limit ${LOTE}
            )`
        : `delete from public.opportunities
            where id in (
              select id from public.opportunities
               order by data_captura desc
              offset $1 limit $2
            )`,
      POR_FONTE ? pares.flat() : [MANTER, LOTE]
    );
    if (!rowCount) break;
    apagados += rowCount;
    console.log(hora(), "…", apagados + "/" + sobra);
  }

  // Órfãos do histórico (sem FK, então não caem sozinhos).
  for (const tab of ["oportunidades_historico", "anuncio_preco_log"]) {
    try {
      const { rowCount } = await c.query(
        `delete from public.${tab}
          where opportunity_id is not null
            and not exists (select 1 from public.opportunities o where o.id = ${tab}.opportunity_id)`
      );
      console.log(hora(), "   órfãos em", tab + ":", rowCount);
    } catch (e) {
      console.log(hora(), "   (pulei", tab + ":", e.message.slice(0, 60) + ")");
    }
  }

  const fim = Number((await q("select count(*)::int n from public.opportunities"))[0].n);
  console.log("\n" + hora(), "✅ apagados", apagados, "| sobraram", fim, "anúncios");
  console.log(hora(), "   ⚠️ o espaço só volta ao sistema operacional depois de um VACUUM;");
  console.log(hora(), "      no Supabase o autovacuum faz isso sozinho em pouco tempo.");
  await c.end();
})().catch((e) => { console.error("falhou:", e.message); process.exit(1); });
