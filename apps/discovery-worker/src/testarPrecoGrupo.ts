import fs from "node:fs";
import { acharPrecoEmTexto } from "./precoTextoLivrePY.js";

/** Casos REAIS colhidos dos grupos em 06/10/2026, com o valor que um humano lê. */
const CASOS: [string, number | null, string][] = [
  ["TOYOTA FUNCARGO 1.5 4x2 PRECIO: Gs. 23.000.000 NEGOCIABLE Motor 1.5 VVT-i", 23000000, "marcador + Gs."],
  ["VENDO!!! 0991911781 PRECIO: 36.000.000GS PRECIO NEGOCIABLE TOYOTA RACTIS", 36000000, "sufixo GS + telefone na frente"],
  ["MEGA IMPECABLE NEW ALLION AÑO 2008 MOTOR 1.8 4X2 FULL PRECIO: 43MILLONES 0994684938", 43000000, "43MILLONES colado + ano + motor + telefone"],
  ["MEGA IMPONENTE RUNX AÑO 2004 1500 4X2 AIRE FULL PRECIO : 38 MILLONES NEGOCIABLE 0994 684 938", 38000000, "espaço antes dos dois pontos"],
  ["Vendo Suzuki Swift 2008 mecánico aire full 18 millones", 18000000, "sem marcador"],
  ["Vendo toyota iq año 2009 automático motor 1300,tiene bujes nuevos,,25 millones, título", 25000000, "vírgulas coladas"],
  ["VendoToyota Allex 2003 1500cc caja automatica Precio 28.750.000gs CONSULTAS 0991 975 251", 28750000, "cilindrada + telefone com espaços"],
  ["Vendo Toyota Ractis impecable 32 millones único dueño 11400km 0992451834", 32000000, "km + telefone"],
  ["Vendo yamaha 250cc modelo 2018 Oferta del dia 10 millones", 10000000, "moto, mas o preço é o preço"],
  // ⚠️ NEGATIVOS: não pode inventar preço
  ["Te espera tu moto Buler la mejor de todas al mejor precio!!! Escribíme PYG30", null, "selo PYG30 truncado, sem preço real"],
  ["Compro y vendo transformadores usado a buen precio PYG60", null, "sem valor"],
  ["Donde tenes amigos para ver", null, "comentário"],
  ["VENDO IMPONENTE HILUX SURF 97/98 Motor 3.0 1kz Automático 4x4", null, "sem preço no texto"],
];

let falhas = 0;
for (const [texto, esperado, rotulo] of CASOS) {
  const r = acharPrecoEmTexto(texto);
  const obtido = r ? r.valor : null;
  const ok = obtido === esperado;
  if (!ok) falhas++;
  const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString("es-PY"));
  console.log(`  ${ok ? "✅" : "❌"} ${String(fmt(obtido)).padStart(12)} ${String(r?.como ?? "").padEnd(14)} ${rotulo}${ok ? "" : `   (esperado ${fmt(esperado)})`}`);
}
console.log(falhas === 0 ? `\n✅ TODAS PASSAM (${CASOS.length})` : `\n⚠️ ${falhas} falha(s)`);

// e contra os 140 posts reais
const dir = "C:/claude/backup-autoradar/grupos";
if (fs.existsSync(dir)) {
  const todos = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")) as { texto: string }[]);
  const comPreco = todos.map((p) => acharPrecoEmTexto(p.texto)).filter(Boolean);
  const porComo: Record<string, number> = {};
  for (const p of comPreco) porComo[p!.como] = (porComo[p!.como] ?? 0) + 1;
  console.log(`\n=== nos ${todos.length} posts reais: ${comPreco.length} com preço (${Math.round(comPreco.length / todos.length * 100)}%) ===`);
  console.log("   por regra:", Object.entries(porComo).map(([k, v]) => `${k}=${v}`).join(" · "));
}
