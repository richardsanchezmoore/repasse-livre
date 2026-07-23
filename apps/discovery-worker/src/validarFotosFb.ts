import "dotenv/config";
import { fetch as undiciFetch } from "undici";
import { supabase } from "./supabaseClient.js";

/**
 * Valida DE VERDADE a foto principal dos anúncios FB que ainda estão com URL crua do
 * fbcdn: busca a imagem como o SITE busca (UA de navegador, SEM referer — o <img> usa
 * referrerPolicy="no-referrer") e vê se carrega (200) ou dá 403/erro. Regra do negócio:
 * VEÍCULO SEM FOTO NÃO É ACEITO → os quebrados viram status=rejeitada. Não chuta pelo `oe`.
 *
 * Uso: tsx src/validarFotosFb.ts [--dry]   (--dry só valida e conta; sem --dry rejeita os quebrados)
 */
const DRY = process.argv.includes("--dry");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CONCORRENCIA = 8;

async function carrega(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await undiciFetch(url, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    return r.ok; // 200-299 = foto carrega
  } catch {
    return false;
  }
}

async function main() {
  const alvos: { id: string; foto: string }[] = [];
  for (let ini = 0; ; ini += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, foto_principal")
      .eq("fonte", "FACEBOOK")
      .eq("status", "aprovada")
      .like("foto_principal", "%fbcdn%")
      .range(ini, ini + 999);
    if (error) {
      console.error("ERRO:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    for (const o of data) if (o.foto_principal) alvos.push({ id: o.id, foto: o.foto_principal });
    if (data.length < 1000) break;
  }

  console.log(`Validando ${alvos.length} anúncios FB (foto fbcdn) — carrega mesmo (200) ou 403?`);
  const quebrados: string[] = [];
  let ok = 0;
  for (let i = 0; i < alvos.length; i += CONCORRENCIA) {
    const lote = alvos.slice(i, i + CONCORRENCIA);
    const res = await Promise.all(lote.map((a) => carrega(a.foto)));
    res.forEach((bom, j) => (bom ? ok++ : quebrados.push(lote[j].id)));
    if (i % (CONCORRENCIA * 15) === 0) console.log(`  …${i + lote.length}/${alvos.length} (com foto ${ok}, quebrados ${quebrados.length})`);
  }

  console.log(`\nRESULTADO VALIDADO: ${ok} COM foto (200) · ${quebrados.length} SEM foto (403/erro).`);
  if (DRY) {
    console.log("(--dry: nada alterado — rode sem --dry pra rejeitar os sem-foto)");
    return;
  }
  let feitos = 0;
  for (let i = 0; i < quebrados.length; i += 200) {
    const l = quebrados.slice(i, i + 200);
    const { error } = await supabase.from("opportunities").update({ status: "rejeitada" }).in("id", l);
    if (error) console.error("  ! lote falhou:", error.message);
    else feitos += l.length;
  }
  console.log(`Rejeitados (regra: sem foto não entra): ${feitos}.`);
}

main();
