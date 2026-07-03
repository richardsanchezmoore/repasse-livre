import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * Corrige retroativamente as fotos das oportunidades do Mercado Livre salvas
 * antes do fix em `salvarElegivel` (mercadoLivreService.ts).
 *
 * BUG: o código antigo sempre punha `anuncio.fotoPrincipal` (thumbnail do card,
 * baixa-res, URL `D_Q_NP_...-E-`) como PRIMEIRA foto e depois as full-res do
 * detalhe (`D_NQ_NP_...-F-`). Como as URLs diferem, o filter não removia nada →
 * a 1ª foto entrava DUPLICADA: baixa-res no destaque + full-res na galeria.
 *
 * FIX retroativo: quando há fotos de detalhe (fotos_secundarias não-vazio) e a
 * `foto_principal` é um thumbnail de card, promove `sec[0]` (full-res) a
 * principal e descarta o thumbnail. Registros card-only (sem secundárias) e os
 * que já têm principal full-res ficam intactos.
 *
 * Uso: npm run backfill:fotos-ml            (dry-run: só imprime)
 *      npm run backfill:fotos-ml -- --aplicar (grava)
 */

/** True se a URL é o thumbnail baixa-res do card (D_Q_NP), não a full-res do detalhe (D_NQ_NP). */
function ehThumbnailDeCard(url: string | null): boolean {
  if (!url) return false;
  return url.includes("D_Q_NP_") && !url.includes("D_NQ_NP_");
}

async function executar(): Promise<void> {
  const aplicar = process.argv.includes("--aplicar");
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, foto_principal, fotos_secundarias")
    .eq("fonte", "MERCADO_LIVRE");

  if (error) throw new Error(`Falha ao buscar oportunidades: ${error.message}`);

  console.log(
    `[backfill-fotos-ml] ${data.length} anúncios ML no total. Modo: ${aplicar ? "APLICAR" : "DRY-RUN"}.`
  );

  let corrigidos = 0;
  let cardOnly = 0;
  let jaCorretos = 0;
  let falhas = 0;

  for (const o of data) {
    const sec = (o.fotos_secundarias ?? []) as string[];

    // Card-only (sem fotos de detalhe): nada a deduplicar.
    if (sec.length === 0) {
      cardOnly++;
      continue;
    }
    // Principal já é full-res (card sem foto no momento da captação): não mexer.
    if (!ehThumbnailDeCard(o.foto_principal)) {
      jaCorretos++;
      continue;
    }

    const novaPrincipal = sec[0];
    const novasSecundarias = sec.slice(1);

    if (!aplicar) {
      console.log(
        `[dry] ${o.veiculo}\n   principal: ${o.foto_principal}\n   →         ${novaPrincipal}\n   secundárias: ${sec.length} → ${novasSecundarias.length}`
      );
      corrigidos++;
      continue;
    }

    const { error: erroUpdate } = await supabase
      .from("opportunities")
      .update({ foto_principal: novaPrincipal, fotos_secundarias: novasSecundarias })
      .eq("id", o.id);

    if (erroUpdate) {
      console.warn(`[backfill-fotos-ml] Falha ao salvar "${o.id}": ${erroUpdate.message}`);
      falhas++;
      continue;
    }
    console.log(`[backfill-fotos-ml] ✓ ${o.veiculo} (${novasSecundarias.length + 1} fotos full-res)`);
    corrigidos++;
  }

  console.log(
    `[backfill-fotos-ml] Resultado: ${corrigidos} ${aplicar ? "corrigidos" : "a corrigir"} | ${cardOnly} card-only (intactos) | ${jaCorretos} já full-res | ${falhas} falhas.`
  );
  process.exit(0);
}

executar().catch((erro) => {
  console.error("[backfill-fotos-ml] Falha na execução:", erro);
  process.exit(1);
});
