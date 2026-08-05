// Validação + máscara de CPF e celular (BR). Usada no gate do quiz e no pré-checkout.
// (No /panfleto, que é HTML estático, a mesma lógica está inline no index.html.)

export function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }

// DDDs válidos no Brasil (evita "00", "10", etc.)
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Celular BR: 11 dígitos (DDD + 9 + 8), começando com 9. Aceita +55 opcional. */
export function validarTelefoneBR(tel) {
  let d = soDigitos(tel);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 11) return false;
  if (!DDDS.has(Number(d.slice(0, 2)))) return false;
  return d[2] === "9";
}

/** Máscara (11) 99999-9999 enquanto digita. */
export function formatarTelefoneBR(tel) {
  let d = soDigitos(tel);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? "(" + d : "";
  if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7, 11);
}

/** CPF: 11 dígitos com os 2 dígitos verificadores corretos (algoritmo oficial). */
export function validarCPF(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos iguais (000.., 111.., …)
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(d[i]) * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== Number(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(d[i]) * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === Number(d[10]);
}

/** Máscara 000.000.000-00 enquanto digita. */
export function formatarCPF(cpf) {
  const d = soDigitos(cpf).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + "." + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}
