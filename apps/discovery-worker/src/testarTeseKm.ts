import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/** TESE DO GUSTAVO: o km do campo é o rodado NO PARAGUAI (desde a importação),
 *  não a quilometragem total. Se for verdade: "Recien Importado" tem km BAIXO,
 *  e quando o texto traz um km, ele é MUITO MAIOR que o campo. */
const { data } = await supabase.from("opportunities")
  .select("km, descricao, veiculo_bruto, procedencia, ano").eq("pais","PY").limit(2000);
const l = (data ?? []).filter(o => o.km != null);

const RX = /\b(\d{1,3}(?:[.,]\d{3})+)\s*(?:km|kms|kil[oó]metros?)\b/i;
const recienImportado = (t: string) => /recien\s+importad|importado/i.test(t);

const imp: number[] = [], naoImp: number[] = [];
const pares: { campo: number; texto: number }[] = [];
for (const o of l) {
  const txt = `${o.veiculo_bruto ?? ""} ${o.descricao ?? ""}`;
  const km = Number(o.km);
  (recienImportado(txt) ? imp : naoImp).push(km);
  const m = txt.match(RX);
  if (m) { const t = Number(m[1].replace(/[.,]/g, "")); if (t > 0) pares.push({ campo: km, texto: t }); }
}
const mediana = (v: number[]) => { const s=[...v].sort((a,b)=>a-b); return s.length? s[Math.floor(s.length/2)] : 0; };

console.log(`=== TESE 1: "Recien Importado" tem km do campo MENOR? ===`);
console.log(`  recém-importado (n=${imp.length}):  mediana ${mediana(imp).toLocaleString("es-PY")} km`);
console.log(`  os demais       (n=${naoImp.length}):  mediana ${mediana(naoImp).toLocaleString("es-PY")} km`);

console.log(`\n=== TESE 2: quando o texto traz km, ele é MAIOR que o campo? ===`);
const maiores = pares.filter(p => p.texto > p.campo * 2).length;
console.log(`  ${pares.length} anúncios com km nos DOIS lugares`);
console.log(`  texto MAIOR que o dobro do campo: ${maiores} (${pares.length? Math.round(maiores/pares.length*100):0}%)`);
console.log(`  mediana do campo: ${mediana(pares.map(p=>p.campo)).toLocaleString("es-PY")}  |  mediana do texto: ${mediana(pares.map(p=>p.texto)).toLocaleString("es-PY")}`);
console.log(`\n  amostra:`);
pares.slice(0,6).forEach(p => console.log(`    campo ${String(p.campo).padStart(7)} km  ·  texto ${String(p.texto).padStart(8)} km`));
