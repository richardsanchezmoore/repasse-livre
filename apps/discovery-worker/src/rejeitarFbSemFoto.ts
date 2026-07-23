import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { fbcdnExpirado } from "./fotosFacebook.js";

/**
 * Rejeita (soft, status=rejeitada) os anúncios FB cuja foto_principal é uma URL fbcdn
 * JÁ EXPIRADA — ou seja, sem foto útil e recuperação impossível (o backfill não conseguiu
 * baixar). Motivo: não vale o usuário clicar e cair num anúncio sem foto / que sumiu do FB.
 * Se ainda estiver vivo no FB, a próxima captura re-adiciona com foto fresca (auto-cura).
 * Rodar DEPOIS do backfill. Só toca em fbcdn EXPIRADO (não pega um fresco ainda válido).
 *
 * Uso: tsx src/rejeitarFbSemFoto.ts [--dry]   (--dry só conta, não altera)
 */
const DRY = process.argv.includes("--dry");

async function main() {
  const paraRejeitar: string[] = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, foto_principal")
      .eq("fonte", "FACEBOOK")
      .neq("status", "rejeitada")
      .like("foto_principal", "%fbcdn%")
      .range(inicio, inicio + PAGINA - 1);
    if (error) {
      console.error("ERRO:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    for (const o of data) if (o.foto_principal && fbcdnExpirado(o.foto_principal)) paraRejeitar.push(o.id);
    if (data.length < PAGINA) break;
  }

  console.log(`${paraRejeitar.length} anúncios FB com foto fbcdn EXPIRADA (sem foto útil).`);
  if (DRY) {
    console.log("(--dry: nada alterado)");
    return;
  }
  let feitos = 0;
  for (let i = 0; i < paraRejeitar.length; i += 200) {
    const lote = paraRejeitar.slice(i, i + 200);
    const { error } = await supabase.from("opportunities").update({ status: "rejeitada" }).in("id", lote);
    if (error) console.error("  ! falha no lote:", error.message);
    else feitos += lote.length;
  }
  console.log(`Rejeitados: ${feitos}.`);
}

main();
