import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { rehospedarFotosFacebook, itemIdDoLink } from "./fotosFacebook.js";

/**
 * BACKFILL urgente: re-hospeda as fotos dos anúncios FB que ainda estão com URL crua do
 * fbcdn (que expira em ~dias). Processa do MAIS NOVO pro mais velho (os novos têm mais
 * chance de ainda estar válidos). Os já expirados não baixam → contabiliza como perdidos.
 * Idempotente (nome determinístico + upsert): pode rodar de novo sem duplicar.
 *
 * Uso: tsx src/backfillFotosFacebook.ts [limite]   (default 300 por rodada)
 */

const LIMITE = Number(process.argv[2] ?? 300);
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, link_origem, foto_principal, fotos_secundarias")
    .eq("fonte", "FACEBOOK")
    .neq("status", "rejeitada")
    .like("foto_principal", "%fbcdn%")
    .order("ultimo_visto", { ascending: false, nullsFirst: false })
    .limit(LIMITE);

  if (error) {
    console.error("ERRO ao listar:", error.message);
    return;
  }
  const lista = data ?? [];
  console.log(`Backfill de fotos FB: ${lista.length} anúncios com fbcdn cru (limite ${LIMITE}).`);

  let ok = 0;
  let perdidos = 0;
  let semId = 0;
  for (const o of lista) {
    const itemId = itemIdDoLink(o.link_origem);
    if (!itemId || !o.foto_principal) {
      semId++;
      continue;
    }
    const fotos = [o.foto_principal, ...((o.fotos_secundarias as string[]) ?? [])];
    const reh = await rehospedarFotosFacebook(itemId, fotos);
    if (!reh) {
      perdidos++;
      console.log(`  ✗ expirada/sem-baixar: ${o.veiculo}`);
      await dormir(150);
      continue;
    }
    const { error: erroUp } = await supabase
      .from("opportunities")
      .update({ foto_principal: reh.foto_principal, fotos_secundarias: reh.fotos_secundarias })
      .eq("id", o.id);
    if (erroUp) {
      console.log(`  ! falha ao salvar ${o.veiculo}: ${erroUp.message}`);
    } else {
      ok++;
      if (ok % 20 === 0) console.log(`  … ${ok} re-hospedados`);
    }
    await dormir(250);
  }

  console.log(`\nFIM: ${ok} re-hospedados · ${perdidos} perdidos (expirados) · ${semId} sem item-id.`);
  if (lista.length === LIMITE) console.log(`⚠ Bateu o limite — rode de novo pra continuar (restam mais).`);
}

main();
