import "dotenv/config";
import { supabase } from "./supabaseClient.js";

const { count: total } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY");
const { count: aprov } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY").eq("status","aprovada");
const { data } = await supabase.from("opportunities")
  .select("marca, modelo, ano, preco, moeda, km, segmento, procedencia, foto_principal, fonte")
  .eq("pais","PY").not("modelo","is",null).limit(2000);
const l = data ?? [];

const grupos = new Map<string, number[]>();
for (const o of l) {
  const k = `${o.marca}|${o.modelo}|${o.ano ?? "?"}|${o.moeda}`;
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k)!.push(Number(o.preco));
}
const com3 = [...grupos.entries()].filter(([,v]) => v.length >= 3);
const com5 = [...grupos.entries()].filter(([,v]) => v.length >= 5);

console.log(`base PY: ${total} (${aprov} aprovadas) · ${l.length} com modelo`);
console.log(`grupos marca+modelo+ano+moeda:  ${grupos.size}`);
console.log(`  com 3+ (mediana fraca):        ${com3.length}`);
console.log(`  com 5+ (mediana decente):      ${com5.length}`);
console.log(`\ncobertura: ${Math.round(com3.reduce((a,[,v])=>a+v.length,0)/l.length*100)}% dos anúncios estão num grupo de 3+`);
console.log(`\nkm preenchido: ${l.filter(o=>o.km).length}/${l.length}  ← EIXO da tabela, segundo o handoff`);
console.log(`segmento:      ${l.filter(o=>o.segmento).length}/${l.length}`);
console.log(`procedência:   ${l.filter(o=>o.procedencia && o.procedencia!=="desconhecida").length}/${l.length}`);
console.log(`\n=== os 6 maiores grupos ===`);
com3.sort((a,b)=>b[1].length-a[1].length).slice(0,6).forEach(([k,v])=>{
  const s=[...v].sort((a,b)=>a-b); const med=s[Math.floor(s.length/2)];
  console.log(`  ${k.padEnd(36)} n=${v.length}  mediana=${med.toLocaleString("es-PY")}  (${s[0].toLocaleString("es-PY")} … ${s[s.length-1].toLocaleString("es-PY")})`);
});
