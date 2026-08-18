// Cálculo de parcelas do cartão — IGUAL à Cakto, sem depender de tabela fixa.
// Coeficientes de juros derivados dos valores REAIS do checkout da Cakto em dois
// preços (R$ 22,90 e R$ 67,90); reproduzem os valores deles cent a cent.
//   1x → 1,0000 · 2x → 1,0869 · 3x → 1,0979 · 4x → 1,1195
// Fórmula (igual ao dropdown deles, sobre o preço do produto, sem a taxa):
//   parcela(n) = arredonda( preço × coef[n] / n )
const COEF = { 1: 1, 2: 1.0869, 3: 1.0979, 4: 1.1195 };
const MIN_PARCELA = 5; // a Cakto exige ~R$ 5 mínimo por parcela

// "R$ 22,90" → 22.90 · "R$ 1.234,56" → 1234.56
export function parsePreco(str) {
  let s = String(str ?? "").replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Devolve [{ n, label }] até maxParcelas, cortando parcelas abaixo do mínimo.
export function calcularParcelas(preco, maxParcelas = 4) {
  const p = typeof preco === "number" ? preco : parsePreco(preco);
  if (!p || p <= 0) return [{ n: 1, label: "À vista" }];
  const max = Math.max(1, Math.min(12, Number(maxParcelas) || 4));
  const out = [];
  for (let n = 1; n <= max; n++) {
    const coef = COEF[n] ?? COEF[4] + (n - 4) * 0.011; // extrapola > 4x se um dia precisar
    const valor = Math.round((p * coef) / n * 100) / 100;
    if (n > 1 && valor < MIN_PARCELA) break; // Cakto não oferece parcela < mínimo
    out.push({ n, label: `${n}x de R$ ${valor.toFixed(2).replace(".", ",")}` });
  }
  return out;
}
