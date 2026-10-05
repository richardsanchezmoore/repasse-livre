import { lerPrecoComContexto } from "./precoParaguai.js";

/** Casos REAIS da primeira rodada de Pedro Juan Caballero + negativos. */
const CASOS: [string, string, string, string][] = [
  // textoPreco, contexto, esperado(ok|motivo), rotulo
  ["₲992.363.005", "Cars sur automores", "telefone", "celular lido como preço"],
  ["₲13.245.000", "FINANCIO CON 13.245.000 DE ENTREGA", "entrada_financiamento", "entrada do financiamento"],
  ["₲13.245.000", "entrega de 13.245.000 y cuotas", "entrada_financiamento", "entrada escrita ao contrário"],
  // ⚠️ NEGATIVOS: estes TÊM que passar
  ["₲46.000.000", "2017 Kia Rio Hatchback 1.4 mec vern - Financio", "ok", "anúncio legítimo que oferece financiamento"],
  ["₲55.000.000", "Kia Picanto 2022 1.0 Flex Aut - financio con entrega a convenir", "ok", "financia mas o preço é real"],
  ["₲990.000.000", "Mercedes-Benz S560 2018 blindado", "ok", "carro caro DE VERDADE, valor redondo"],
  ["₲42.000.000", "2009 Toyota new vitz 1.3 vern", "ok", "comum"],
  ["US$ 33.000", "Corolla Cross 2026 0km", "ok", "dólar normal"],
];

let falhas = 0;
for (const [texto, ctx, esperado, rotulo] of CASOS) {
  const r = lerPrecoComContexto(texto, ctx);
  const obtido = r.ok ? "ok" : r.motivo;
  const passou = obtido === esperado;
  if (!passou) falhas++;
  console.log(`  ${passou ? "✅" : "❌"} ${String(obtido).padEnd(22)} ${rotulo}${passou ? "" : `   (esperado: ${esperado})`}`);
}
console.log(falhas === 0 ? `\n✅ TODAS PASSAM (${CASOS.length})` : `\n⚠️ ${falhas} falha(s)`);
