import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/** km escrito no texto: "11400km", "120.000 km", "11 mil km", "120mil kms" */
const RX_KM = [
  /\b(\d{1,3}(?:[.,]\d{3})+)\s*(?:km|kms|kilometros|kilómetros)\b/i,
  /\b(\d{2,7})\s*(?:km|kms|kilometros|kilómetros)\b/i,
  /\b(\d{1,3})\s*mil\s*(?:km|kms)\b/i,
];
const PLACEHOLDER = new Set([0, 100, 300, 500, 1000, 1111, 10000, 11111, 99999, 100000]);

const { data } = await supabase.from("opportunities").select("km, descricao, veiculo_bruto, ano").eq("pais","PY").limit(2000);
const l = data ?? [];
let suspeitos = 0, recuperaveis = 0, concordam = 0;
const exemplos: string[] = [];

for (const o of l) {
  const km = o.km == null ? null : Number(o.km);
  const texto = `${o.veiculo_bruto ?? ""} ${o.descricao ?? ""}`;
  let doTexto: number | null = null;
  for (const [i, rx] of RX_KM.entries()) {
    const m = texto.match(rx);
    if (m) { const n = Number(m[1].replace(/[.,]/g, "")); doTexto = i === 2 ? n * 1000 : n; break; }
  }
  const ehPlaceholder = km != null && PLACEHOLDER.has(km);
  if (ehPlaceholder) suspeitos++;
  if (ehPlaceholder && doTexto && doTexto > 1000) {
    recuperaveis++;
    if (exemplos.length < 6) exemplos.push(`km=${km} → texto diz ${doTexto.toLocaleString("es-PY")}  |  ${texto.slice(0,58).replace(/\s+/g," ")}`);
  }
  if (km && doTexto && Math.abs(km - doTexto) / Math.max(km, doTexto) < 0.1) concordam++;
}
console.log(`${l.length} anúncios PY`);
console.log(`  com km que parece PLACEHOLDER: ${suspeitos} (${Math.round(suspeitos/l.length*100)}%)`);
console.log(`  desses, com km REAL no texto:  ${recuperaveis}`);
console.log(`  casos em que campo e texto concordam: ${concordam}`);
console.log(`\n=== exemplos recuperáveis ===`);
exemplos.forEach(e => console.log("  " + e));
