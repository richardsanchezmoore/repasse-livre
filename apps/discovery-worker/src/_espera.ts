import "dotenv/config";
import { supabase } from "./supabaseClient.js";
/** Espera o backfill parar de avancar (duas leituras iguais seguidas). */
async function conta() {
  const r = await supabase.from("opportunities").select("*",{count:"exact",head:true}).eq("pais","PY").not("foto_hash","is",null);
  return r.count ?? 0;
}
async function main(){
  let anterior = -1, igual = 0;
  for (let i = 0; i < 60; i++) {
    const n = await conta();
    if (n === anterior) { igual++; if (igual >= 2) { console.log(`estabilizou em ${n}`); return; } }
    else { igual = 0; console.log(`  ${new Date().toLocaleTimeString("pt-BR")} · ${n} com hash`); }
    anterior = n;
    await new Promise(r => setTimeout(r, 30000));
  }
  console.log(`tempo esgotado em ${anterior}`);
}
main().catch(e=>console.error(e.message));
