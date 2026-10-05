import "dotenv/config";
import { baixarLogado, fecharContexto } from "./navegadorFacebook.js";

const casos: [string, string][] = [
  ["asuncion (SLUG que ja usamos)", "https://www.facebook.com/marketplace/asuncion/carros/?exact=false&radius=65&locale=es_LA"],
  ["CDE (ID que ja usamos)", "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA"],
  ["pedrojuancaballero (slug)", "https://www.facebook.com/marketplace/pedrojuancaballero/carros/?exact=0&locale=es_LA"],
  ["filadelfia (slug)", "https://www.facebook.com/marketplace/filadelfia/carros/?exact=0&locale=es_LA"],
  ["slug INVENTADO (controle negativo)", "https://www.facebook.com/marketplace/xyzcidadequenaoexiste/carros/?exact=0&locale=es_LA"],
];

const conjuntos: Record<string, string[]> = {};
for (const [rot, url] of casos) {
  try {
    const html = await baixarLogado(url, 2500);
    const ids = [...new Set([...html.matchAll(/marketplace\/item\/(\d{8,})/g)].map((m) => m[1]))].sort();
    conjuntos[rot] = ids;
    console.log(`${String(ids.length).padStart(3)}  ${rot}`);
  } catch (e) { console.log(`  ✗ ${rot}: ${(e as Error).message.slice(0, 50)}`); }
}
console.log("\n=== os conjuntos sao IGUAIS? (se sim, o FB ignora o slug) ===");
const rots = Object.keys(conjuntos);
for (let i = 1; i < rots.length; i++) {
  const a = conjuntos[rots[0]] ?? [], b = conjuntos[rots[i]] ?? [];
  const comuns = a.filter((x) => b.includes(x)).length;
  const pct = a.length ? Math.round((comuns / a.length) * 100) : 0;
  console.log(`  ${pct}% em comum com "${rots[0]}"  ←  ${rots[i]}`);
}
await fecharContexto();
