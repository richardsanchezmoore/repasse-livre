import "dotenv/config";
import { supabase } from "./supabaseClient.js";

const { data } = await supabase.from("opportunities").select("id, foto_principal, veiculo").eq("pais", "PY");
const l = data ?? [];
const conta = { nova: 0, morta: 0, fbcdn: 0, nula: 0 };
const mortas: string[] = [];
for (const o of l) {
  const f = o.foto_principal as string | null;
  if (!f) conta.nula++;
  else if (f.includes("wmeggxmzroundpkcthxk")) conta.nova++;
  else if (f.includes("chuvlvwctwkeviencfuy")) { conta.morta++; mortas.push(o.id as string); }
  else if (f.includes("fbcdn")) conta.fbcdn++;
}
console.log(`anúncios PY: ${l.length}`);
console.log(`  bucket NOVO:  ${conta.nova}`);
console.log(`  bucket MORTO: ${conta.morta}  ← aponta para o projeto cortado`);
console.log(`  fbcdn cru:    ${conta.fbcdn}`);
console.log(`  sem foto:     ${conta.nula}`);

// ⚠️ URL morta vira imagem QUEBRADA na tela, que é pior que espaço vazio — a
// mesma decisão de 03/10. Zera as que sobraram.
if (mortas.length && !process.argv.includes("--conferir")) {
  for (const id of mortas) {
    await supabase.from("opportunities").update({ foto_principal: null, fotos_secundarias: [] }).eq("id", id);
  }
  console.log(`\n${mortas.length} URLs mortas zeradas (imagem quebrada é pior que espaço vazio)`);
}
