import "dotenv/config";
import { Client } from "pg";

/**
 * Corrige retroativamente o título (`veiculo`) das oportunidades de
 * MERCADO_LIVRE e WEBMOTORS salvas antes da correção em
 * mercadoLivreService.ts / webmotorsService.ts — quando `veiculo` guardava só
 * "marca modelo" (cortado) e o resto do nome ficava em `versao` (que não é
 * exibido em Descobertas). A OLX já guardava o título completo; essas duas
 * fontes agora também.
 *
 * Reconstrói o título completo concatenando `versao` ao `veiculo` cortado.
 * IDEMPOTENTE: só atualiza linhas cujo `veiculo` ainda NÃO contém o `versao`
 * (position = 0), então rodar de novo — ou rodar sobre linhas já salvas com
 * o título completo pela correção nova — não duplica nada.
 *
 * Usa `pg` direto (DATABASE_URL do Session Pooler) num único UPDATE atômico,
 * igual rodarMigracoes.ts. Uso: npm run backfill:titulos-multifonte
 */
async function executarBackfill(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada (.env do discovery-worker).");
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const { rowCount } = await client.query(`
      update opportunities
      set veiculo = veiculo || ' ' || versao
      where fonte in ('MERCADO_LIVRE', 'WEBMOTORS')
        and versao is not null
        and versao <> ''
        and position(versao in veiculo) = 0
    `);

    console.log(`[backfill-titulos-multifonte] ${rowCount ?? 0} oportunidade(s) corrigida(s).`);
  } finally {
    await client.end();
  }
}

executarBackfill().catch((erro) => {
  console.error("[backfill-titulos-multifonte] Falha na execução:", erro);
  process.exitCode = 1;
});
