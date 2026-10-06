import fs from "node:fs";
import { conferirAnoModelo, coberturaAnos } from "./anoModeloPY.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";

const CASOS: [string, number | null, boolean, string][] = [
  // modelo, ano, devePassar, rotulo
  ["vitz", 2007, true, "Vitz 2007 — dentro da faixa"],
  ["vitz", 1995, false, "Vitz 1995 — o modelo só nasce em 1999"],
  ["funcargo", 2003, true, "FunCargo 2003 — ok"],
  ["funcargo", 2012, false, "FunCargo 2012 — saiu de linha em 2005"],
  ["platz", 2004, true, "Platz 2004 — ok"],
  ["allion", 2008, true, "Allion 2008 — ok"],
  ["allion", 1998, false, "Allion 1998 — só a partir de 2001"],
  ["ractis", 2005, true, "Ractis 2005 — ano de estreia"],
  ["ractis", 2004, true, "Ractis 2004 — dentro da FOLGA de 1 ano"],
  ["ractis", 2002, false, "Ractis 2002 — fora até com folga"],
  ["premio", 2022, true, "Premio 2022 — folga sobre o fim em 2021"],
  ["vitz", null, false, "sem ano"],
  ["corolla", 2010, true, "modelo sem faixa no dicionário — não acusa"],
];

let falhas = 0;
for (const [modelo, ano, devePassar, rotulo] of CASOS) {
  const r = conferirAnoModelo(modelo, ano);
  const ok = r.ok === devePassar;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✅" : "❌"} ${r.ok ? "passa " : "AVISA "} ${String(r.problema ?? "").padEnd(18)} ${rotulo}`);
  if (r.aviso) console.log(`        → ${r.aviso}`);
}
const cob = coberturaAnos();
console.log(falhas === 0 ? `\n✅ TODAS PASSAM (${CASOS.length})` : `\n⚠️ ${falhas} falha(s)`);
console.log(`cobertura: ${cob.total} modelos com faixa · ${cob.firmes} confirmados em fonte`);

// ── contra a amostra REAL dos grupos ──────────────────────────────────────
const dir = "C:/claude/backup-autoradar/grupos";
if (fs.existsSync(dir)) {
  const posts = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")) as { texto: string }[]);
  let avisos = 0, conferidos = 0;
  for (const p of posts) {
    const v = normalizarVeiculoPY(p.texto);
    if (!v.modelo || v.ano === null) continue;
    conferidos++;
    const r = conferirAnoModelo(v.modelo.toLowerCase(), v.ano);
    if (!r.ok && r.problema !== "ano_ausente") {
      avisos++;
      if (avisos <= 6) console.log(`  ⚠️ ${r.aviso}`);
    }
  }
  console.log(`\nna amostra dos grupos: ${conferidos} com modelo+ano · ${avisos} com aviso`);
}
