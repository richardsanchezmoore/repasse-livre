import "./_carregarEnv"; // PRIMEIRO — popula process.env de .env.local
import { supabaseAdmin } from "@/lib/supabase";
import { computarFactSheet } from "@/lib/bia/factSheet";
import { gerarParecerLLM, fingerprintParecer } from "@/lib/bia/parecerLLM";
import type { AnuncioBia, PontoPreco } from "@/lib/bia/tipos";

/**
 * Gera e ARMAZENA a prosa do parecer do Copiloto (Fase C) — fora do acesso à
 * página. Roda a engine BIA nativa do admin (uma fonte só da régua) + a LLM
 * (Haiku por padrão), e grava em opportunities.copiloto_parecer. A página só lê.
 *
 * Só (re)gera quando os fatos que dirigem a prosa mudam (fingerprint) — então
 * posição/percentil não ficam stale sem custo à toa. Agrupa por fipe_codigo pra
 * carregar a coorte uma vez por modelo.
 *
 * DRY-RUN por padrão (só conta, sem tocar na LLM/banco). --aplicar gera e grava.
 * Uso: npm run gerar:pareceres [--aplicar] [--limit=N]
 */

const APLICAR = process.argv.includes("--aplicar");
const LIMITE = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || Infinity;
// Só gera pra anúncios com data_captura >= DESDE (ISO). A COORTE segue cheia
// (posição/percentil corretos); o filtro é só em QUEM ganha parecer.
const DESDE = process.argv.find((a) => a.startsWith("--desde="))?.split("=")[1] || null;
// Só gera pra anúncios com margem <= MARGEM_MAX (a COORTE segue cheia). Serve pra
// escopar um reparo barato (ex.: --margem-max=5 regenera só os < 5% afetados por
// um ajuste na régua de margem, sem tocar no resto).
const MARGEM_MAX_ARG = process.argv.find((a) => a.startsWith("--margem-max="))?.split("=")[1];
const MARGEM_MAX = MARGEM_MAX_ARG != null ? Number(MARGEM_MAX_ARG) : null;
// Só REGENERA quem já tem parecer (fingerprint != null) — não cria pra quem nunca
// teve. Serve pra CORRIGIR os existentes sem pagar pelo backfill de quem falta
// (ex.: drift antigo abaixo da FIPE que não vale o gasto).
const SO_EXISTENTES = process.argv.includes("--so-existentes");

// Regenera só UM anúncio (--id=<uuid>) — reprocessa um caso específico (ex.: o
// anúncio-vitrine do demo) sem varrer o resto. A coorte inteira ainda é carregada
// (a régua precisa dela), mas só esse id é (re)gerado.
const ALVO_ID = process.argv.find((a) => a.startsWith("--id="))?.split("=")[1] || null;

// --ids=<uuid,uuid,...> — regenera um conjunto específico numa passada só (ex.:
// os afetados por uma mudança de régua). Une com --id se ambos vierem.
const ALVO_IDS = new Set<string>(
  [
    ...(process.argv.find((a) => a.startsWith("--ids="))?.split("=")[1]?.split(",") ?? []),
    ...(ALVO_ID ? [ALVO_ID] : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
);

const CAMPOS =
  "id, fipe_codigo, veiculo, ano, estado, preco, fipe_valor, margem_percentual, km, data_captura, foto_principal, fotos_secundarias, descricao, atributos_olx, link_origem, status, copiloto_fingerprint";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Linha = AnuncioBia & {
  link_origem: string;
  status: string | null;
  veiculo: string | null;
  ano: string | null;
  data_captura: string | null;
  copiloto_fingerprint: string | null;
};

async function carregarPrecoLog(links: string[]): Promise<Map<string, PontoPreco[]>> {
  const mapa = new Map<string, PontoPreco[]>();
  for (let i = 0; i < links.length; i += 300) {
    const lote = links.slice(i, i + 300);
    const { data } = await supabaseAdmin
      .from("anuncio_preco_log")
      .select("link_origem, preco, visto_em")
      .in("link_origem", lote);
    for (const r of (data as ({ link_origem: string } & PontoPreco)[] | null) ?? []) {
      if (!mapa.has(r.link_origem)) mapa.set(r.link_origem, []);
      mapa.get(r.link_origem)!.push({ preco: r.preco, visto_em: r.visto_em });
    }
  }
  return mapa;
}

async function main(): Promise<void> {
  // Carrega os anúncios ativos (mercado) com fipe_codigo, agrupados por código.
  const grupos = new Map<string, Linha[]>();
  let total = 0;
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select(CAMPOS)
      .not("fipe_codigo", "is", null)
      .neq("status", "rejeitada")
      .range(inicio, inicio + 999);
    if (error) throw new Error(`listar: ${error.message}`);
    const linhas = (data as Linha[] | null) ?? [];
    for (const l of linhas) {
      if (!grupos.has(l.fipe_codigo!)) grupos.set(l.fipe_codigo!, []);
      grupos.get(l.fipe_codigo!)!.push(l);
    }
    total += linhas.length;
    if (linhas.length < 1000) break;
  }

  console.log(`[pareceres] ${total} anúncios em ${grupos.size} coortes (fipe_codigo). Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}${Number.isFinite(LIMITE) ? ` (limite ${LIMITE})` : ""}${DESDE ? ` (só data_captura >= ${DESDE})` : ""}.`);
  if (!APLICAR && !process.env.ANTHROPIC_API_KEY) console.log("[pareceres] aviso: sem ANTHROPIC_API_KEY — no --aplicar cairia no template.");

  let pendentes = 0, gerados = 0, jaFrescos = 0, falhas = 0, foraJanela = 0, foraMargem = 0, semParecer = 0;
  for (const [, universo] of grupos) {
    if (ALVO_IDS.size && !universo.some((a) => ALVO_IDS.has(a.id))) continue; // --id/--ids: só a coorte dos alvos
    const precoLog = await carregarPrecoLog(universo.map((a) => a.link_origem));
    for (const anuncio of universo) {
      if (ALVO_IDS.size && !ALVO_IDS.has(anuncio.id)) continue;
      // Fora da janela → não gera (mas segue na coorte 'universo' acima).
      if (DESDE && (!anuncio.data_captura || anuncio.data_captura < DESDE)) { foraJanela++; continue; }
      if (MARGEM_MAX != null && (anuncio.margem_percentual == null || anuncio.margem_percentual > MARGEM_MAX)) { foraMargem++; continue; }
      if (SO_EXISTENTES && anuncio.copiloto_fingerprint == null) { semParecer++; continue; }
      const fs = computarFactSheet(anuncio, universo, precoLog.get(anuncio.link_origem) ?? []);
      const ctx = { veiculo: anuncio.veiculo, ano: anuncio.ano };
      const fp = fingerprintParecer(fs, ctx);

      if (anuncio.copiloto_fingerprint === fp) { jaFrescos++; continue; }
      pendentes++;

      if (!APLICAR) {
        if (pendentes <= 3) console.log(`  pendente: ${anuncio.veiculo ?? anuncio.id}\n    base: ${fs.copiloto}`);
        continue;
      }
      if (gerados + falhas >= LIMITE) continue;

      const prosa = await gerarParecerLLM(fs, ctx);
      if (!prosa) { falhas++; continue; }
      const { error } = await supabaseAdmin
        .from("opportunities")
        .update({ copiloto_parecer: prosa, copiloto_gerado_em: new Date().toISOString(), copiloto_fingerprint: fp })
        .eq("id", anuncio.id);
      if (error) { falhas++; console.log(`  ⚠️  ${anuncio.id}: ${error.message}`); continue; }
      gerados++;
      if (gerados % 25 === 0) console.log(`[pareceres] ${gerados} gerados…`);
      await sleep(120); // gentil com o rate limit
    }
  }

  console.log(
    `[pareceres] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: ${jaFrescos} já frescos | ${pendentes} pendentes` +
      (DESDE ? ` | ${foraJanela} fora da janela` : "") +
      (MARGEM_MAX != null ? ` | ${foraMargem} fora da margem (>${MARGEM_MAX}%)` : "") +
      (SO_EXISTENTES ? ` | ${semParecer} pulados (sem parecer prévio)` : "") +
      (APLICAR ? ` | ${gerados} gerados | ${falhas} falhas` : " (rode com --aplicar pra gerar)")
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("[pareceres] Falha:", e);
  process.exit(1);
});
