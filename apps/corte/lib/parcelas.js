// Cálculo de preço/parcelas do cartão — IGUAL à Cakto, sem tabela fixa.
// Coeficientes de juros derivados dos valores REAIS do checkout da Cakto em dois
// preços (R$ 22,90 e R$ 67,90); reproduzem os valores deles cent a cent.
//   1x → 1,0000 · 2x → 1,0869 · 3x → 1,0979 · 4x → 1,1195
// Fórmula do dropdown (sobre o produto, sem taxa): parcela(n) = arredonda(preço × coef[n] / n)
const COEF = { 1: 1, 2: 1.0869, 3: 1.0979, 4: 1.1195 };
const MIN_PARCELA = 5; // a Cakto exige ~R$ 5 mínimo por parcela

// Taxa de serviço que a Cakto repassa ao comprador (somada ao Total). FLAT — confirmada
// em R$ 5,00 / 22,90 / 67,90 (sempre +0,99, não é percentual). Se a Cakto mudar, é só aqui.
export const TAXA_SERVICO = 0.99;

// "R$ 22,90" → 22.90 · "R$ 1.234,56" → 1234.56
export function parsePreco(str) {
  let s = String(str ?? "").replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}
export function fmtReais(n) {
  return "R$ " + fmt(Number(n) || 0);
}

// Devolve [{ n, label, total }] até maxParcelas:
//   label = valor por parcela do PRODUTO (igual ao dropdown da Cakto, sem taxa)
//   total = valor por parcela JÁ com a taxa de serviço (pro "Total" do resumo)
export function calcularParcelas(preco, maxParcelas = 4) {
  const p = typeof preco === "number" ? preco : parsePreco(preco);
  if (!p || p <= 0) return [{ n: 1, label: "À vista", total: "" }];
  const max = Math.max(1, Math.min(12, Number(maxParcelas) || 4));
  const out = [];
  for (let n = 1; n <= max; n++) {
    const coef = COEF[n] ?? COEF[4] + (n - 4) * 0.011; // extrapola > 4x se um dia precisar
    const prod = Math.round((p * coef) / n * 100) / 100;
    if (n > 1 && prod < MIN_PARCELA) break; // Cakto não oferece parcela abaixo do mínimo
    const comTaxa = Math.round((p * coef + TAXA_SERVICO) / n * 100) / 100;
    out.push({
      n,
      label: `${n}x de R$ ${fmt(prod)}`,
      total: n === 1 ? `R$ ${fmt(comTaxa)}` : `${n}x de R$ ${fmt(comTaxa)}`,
    });
  }
  return out;
}
