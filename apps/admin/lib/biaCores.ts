// Helpers de cor/formatação pro design "neo-fintech" do /bia — escala
// choroplética dark em OKLCH e mapeamento de cor por marca, replicando a
// lógica do handoff de design recebido do usuário (Claude Design).

export interface CorMapa {
  bg: string;
  fg: string;
}

/** Escala choroplética dark: L e C crescem com `t` (0-1), hue fixo por métrica. */
export function corMapa(t: number, hue: number): CorMapa {
  const L = 0.3 + 0.5 * t;
  const C = 0.04 + 0.13 * t;
  const bg = `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${hue})`;
  const fg = L < 0.58 ? `oklch(0.95 0.02 ${hue})` : `oklch(0.22 0.04 ${hue})`;
  return { bg, fg };
}

/** Normalização com raiz — suaviza outlier (ex.: SP muito acima do resto). */
export function normalizar(valor: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.sqrt((valor - min) / (max - min));
}

export function formatarInteiro(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/** R$ arredondado, sem centavos (diferente de formatarMoeda, que mantém centavos). */
export function formatarMoedaArredondada(n: number): string {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

export function formatarPercentual1(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

// Posição de cada UF no mapa-tile esquemático (linha, coluna) — não é
// geografia real, é um grid estilizado que lembra o contorno do Brasil.
const GRID_UF: Record<string, [number, number]> = {
  RR: [1, 4],
  AP: [1, 5],
  AM: [2, 3],
  PA: [2, 4],
  MA: [2, 5],
  CE: [2, 6],
  RN: [2, 7],
  AC: [3, 2],
  RO: [3, 3],
  TO: [3, 4],
  PI: [3, 5],
  PE: [3, 6],
  PB: [3, 7],
  MT: [4, 3],
  BA: [4, 5],
  AL: [4, 6],
  SE: [4, 7],
  MS: [5, 3],
  GO: [5, 4],
  DF: [5, 5],
  MG: [6, 5],
  ES: [6, 6],
  SP: [7, 4],
  RJ: [7, 5],
  PR: [8, 4],
  SC: [9, 4],
  RS: [10, 4],
};

export function posicaoGridUf(uf: string): [number, number] | null {
  return GRID_UF[uf] ?? null;
}

function hashString(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) % 360;
  }
  return hash;
}

// Cores vivas curadas pras marcas mais comuns (mesmos valores do handoff de
// design) — qualquer marca fora dessa lista cai num hue determinístico (hash
// do nome), pra nunca repetir cor por acaso entre marcas diferentes.
const CORES_MARCA: Record<string, string> = {
  Chevrolet: "oklch(0.74 0.15 75)",
  Volkswagen: "oklch(0.68 0.15 255)",
  Jeep: "oklch(0.72 0.15 150)",
  Hyundai: "oklch(0.72 0.12 210)",
  Fiat: "oklch(0.68 0.18 25)",
  Toyota: "oklch(0.7 0.15 20)",
  Honda: "oklch(0.65 0.15 25)",
  Renault: "oklch(0.7 0.16 95)",
  Nissan: "oklch(0.65 0.13 250)",
  Ford: "oklch(0.62 0.18 260)",
};

export function corDaMarca(marca: string): string {
  if (CORES_MARCA[marca]) return CORES_MARCA[marca];
  return `oklch(0.7 0.15 ${hashString(marca)})`;
}

// Hue fixo pras marcas de luxo já conhecidas (mesmo critério do handoff) —
// "Land" é a marca resultante da heurística marca+modelo pra "Land Rover".
const HUE_MARCA_LUXO: Record<string, number> = {
  Audi: 55,
  BMW: 250,
  Land: 150,
  Lexus: 320,
  "Mercedes-Benz": 200,
  Porsche: 60,
};

export function hueMarcaLuxo(marca: string): number {
  return HUE_MARCA_LUXO[marca] ?? hashString(marca);
}
