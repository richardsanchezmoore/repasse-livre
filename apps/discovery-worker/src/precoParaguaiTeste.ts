/**
 * Teste do leitor de preço paraguaio.
 *
 * ★ Os casos NÃO são inventados: cada linha marcada como REAL foi lida em
 * 23/09/2026 no ClasiPar, WebAuto ou Ajogua. É o gabarito de que o parser
 * aguenta o mercado como ele é, não como eu gostaria que fosse.
 *
 * Rodar:  npx tsx src/precoParaguaiTeste.ts
 */
import { lerPreco, ehAnuncioDeCompra, lerProcedencia } from "./precoParaguai.js";

type Caso = [entrada: string, esperado: string, nota?: string];

const CASOS: Caso[] = [
  // ---------- formatos que existem de verdade ----------
  ["Gs. 97.500.000", "PYG 97500000", "REAL — ClasiPar, Chevrolet Tracker 2022"],
  ["Gs. 79.500.000", "PYG 79500000", "REAL — ClasiPar, Hyundai Tucson 2015"],
  ["US$. 36.500,00", "USD 36500", "REAL — ClasiPar, Kia Sportage híbrido"],
  ["US$ 33.000", "USD 33000", "REAL — WebAuto, Isuzu D-Max 2020"],
  ["₲ 120.000.000", "PYG 120000000", "REAL — WebAuto, Kia Sonet 2022"],
  ["US$ 39.800", "USD 39800", "REAL — WebAuto, Ford Territory 2024"],
  ["USD 18.900", "USD 18900"],
  // Formato do Facebook de Ciudad del Este: símbolo COLADO, sem "Gs.".
  ["₲75.000.000", "PYG 75000000", "REAL — FB Marketplace CDE, 23/09"],
  ["₲49.000.000", "PYG 49000000", "REAL — FB Marketplace CDE"],
  ["₲13.500", "X preco_isca", "REAL — FB CDE: treze mil guaranis é R$11, não é carro"],
  ["Gs 45.000.000", "PYG 45000000", "sem ponto depois do Gs"],
  ["$ 12.500", "USD 12500", "cifrão solto"],

  // ---------- preço-isca: tem que ser recusado ----------
  ["Gs. 130", "X preco_isca", "REAL — ClasiPar, Toyota 4Runner por 130 guaranis"],
  ["Gs. 1", "X preco_isca", "REAL — ClasiPar"],
  ["US$. 1,00", "X preco_isca", "REAL — ClasiPar, RAM 1500 RHO 2025"],
  ["US$ 100", "X preco_isca", "cem dólares não é carro"],

  // ---------- moeda trocada no campo ----------
  ["US$ 20.000.000", "PYG 20000000 (corrigido)", "REAL — WebAuto, Toyota Paseo 2000"],
  ["US$ 150.000.000", "PYG 150000000 (corrigido)"],
  ["US$ 45.000", "USD 45000", "quarenta e cinco mil dólares é carro normal, NÃO corrigir"],

  // ---------- absurdo ----------
  ["Gs. 999.999.999.999", "X fora_de_faixa"],
  ["consultar", "X sem_preco"],
  ["", "X sem_preco"],

  // ---------- número puro, sem símbolo ----------
  ["85.000.000", "PYG 85000000", "sete dígitos ou mais só existe em guarani"],
  ["24.500", "USD 24500", "abaixo disso, só faz sentido em dólar"],
];

const COMPRA: [string, boolean][] = [
  ["COMPRO CONTADO HYUNDAI TUCSON", true],
  ["Busco Toyota Hilux 2015 en adelante", true],
  ["Permuto por camioneta", true],
  ["VENDO TOYOTA COROLLA 2018", false],
  ["Chevrolet Tracker 2022 LTZ con garantía", false],
];

const PROCEDENCIA: [string, string][] = [
  ["Toyota Hilux recién importado de Japón", "importado"],
  ["Vehículo importado, listo para transferir", "importado"],
  ["Llegado de Iquique, sin rodar", "importado"],
  ["Hyundai Tucson 2015 único dueño", "uso_local"],
  ["Con uso local, chapa paraguaya", "uso_local"],
  ["Importado, único dueño en Paraguay", "uso_local"],
  ["Kia Sportage LX híbrido con techo corredizo", "desconhecida"],
];

function resumo(entrada: string): string {
  const r = lerPreco(entrada);
  if (!r.ok) return "X " + r.motivo;
  return `${r.moeda} ${r.valor}` + (r.corrigido ? " (corrigido)" : "");
}

let falhas = 0;

console.log("=== LEITURA DE PREÇO ===");
for (const [entrada, esperado, nota] of CASOS) {
  const obtido = resumo(entrada);
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(
    `  ${ok ? "✅" : "❌"} ${JSON.stringify(entrada).padEnd(22)} → ${obtido.padEnd(26)}` +
    (ok ? "" : ` (esperava ${esperado})`) + (nota ? `   ${nota}` : "")
  );
}

console.log("\n=== ANÚNCIO DE COMPRA (não é oferta, não entra na média) ===");
for (const [texto, esperado] of COMPRA) {
  const obtido = ehAnuncioDeCompra(texto);
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✅" : "❌"} ${obtido ? "COMPRA" : "venda "} | ${texto}`);
}

console.log("\n=== PROCEDÊNCIA (as duas curvas de preço) ===");
for (const [texto, esperado] of PROCEDENCIA) {
  const obtido = lerProcedencia(texto);
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✅" : "❌"} ${obtido.padEnd(14)} | ${texto}` + (ok ? "" : `  (esperava ${esperado})`));
}

const total = CASOS.length + COMPRA.length + PROCEDENCIA.length;
console.log(falhas ? `\n❌ ${falhas} FALHA(S) de ${total}` : `\n✅ TODAS PASSAM (${total})`);
process.exit(falhas ? 1 : 0);
