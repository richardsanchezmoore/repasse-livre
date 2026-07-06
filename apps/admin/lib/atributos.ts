/**
 * Normalização de atributos ML → OLX em tempo de LEITURA.
 *
 * A OLX e o Mercado Livre gravam os atributos no MESMO campo (`atributos_olx`),
 * mas com esquemas de CHAVE e VALOR diferentes:
 *   OLX  → carcolor / fuel / owner / cartype …           valor "Flex", "Sim"
 *   ML   → cor / tipo_de_combustível / único_dono / …    valor "Gasolina e álcool"
 * Antes disso, a Procedência do Copiloto, os indicadores da BIA e a ficha da
 * página só reconheciam as chaves OLX → todo anúncio do ML caía em Procedência
 * base 3 e a cor/combustível não entravam nos indicadores.
 *
 * Aqui centralizamos o mapeamento num só lugar e os consumidores leem sempre
 * pelo CAMPO CANÔNICO (o vocabulário da OLX). Sem migrar nem duplicar dado no
 * banco: funciona retroativo pra OLX e ML, e o mapa se afina num arquivo só.
 *
 * PURO (sem React nem supabase) → client-safe (pode ser importado por "use client").
 */

export type MapaAtributos = Record<string, { label: string; value: string }>;

export type CampoCanonico =
  | "carcolor"
  | "fuel"
  | "cartype"
  | "doors"
  | "car_steering"
  | "motorpower"
  | "owner"
  | "warranty"
  | "has_auction"
  | "dealership_review"
  | "is_settled"
  | "has_paid_ipva"
  | "exchange";

// OLX primeiro (vocabulário canônico), depois os sinônimos do Mercado Livre.
const SINONIMOS: Record<CampoCanonico, string[]> = {
  carcolor: ["carcolor", "cor"],
  fuel: ["fuel", "tipo_de_combustível", "tipo_de_combustivel"],
  cartype: ["cartype", "tipo_de_carroceria"],
  doors: ["doors", "portas"],
  car_steering: ["car_steering", "direção", "direcao"],
  motorpower: ["motorpower", "motor"], // CILINDRADA (não potência/hp: a OLX guarda "1.4", "2.0 - 2.9")
  owner: ["owner", "único_dono", "unico_dono"],
  // No ML a garantia vem quebrada em dois campos (mecânica / de fábrica) — booleano OU.
  warranty: [
    "warranty",
    "com_garantia_mecânica",
    "com_garantia_de_fábrica",
    "com_garantia_mecanica",
    "com_garantia_de_fabrica",
  ],
  has_auction: ["has_auction"], // o ML não expõe leilão na ficha técnica
  dealership_review: ["dealership_review"], // idem
  is_settled: ["is_settled"], // estado financeiro; o ML não traz
  has_paid_ipva: ["has_paid_ipva", "com_ipva_pago"],
  exchange: ["exchange", "aceita_troca"],
};

// Campos "OU booleano": basta um dos sinônimos ser "Sim" pra valer.
const BOOLEANO_OU = new Set<CampoCanonico>(["warranty"]);

/** Traz o valor pro vocabulário da OLX quando a fonte (ML) diverge. */
function normalizarValor(campo: CampoCanonico, valor: string): string {
  switch (campo) {
    case "fuel": {
      const s = valor.toLowerCase();
      if (s.includes("gasolina") && s.includes("álcool")) return "Flex"; // "Gasolina e álcool"
      if (s.includes("gasolina") && s.includes("elétrico")) return "Híbrido";
      if (s.includes("tetra")) return "Flex"; // "Tetra-combustible"
      if (s.startsWith("diesel")) return "Diesel";
      if (s === "gasolina") return "Gasolina";
      if (s === "elétrico") return "Elétrico";
      if (s === "álcool") return "Álcool";
      return valor;
    }
    case "doors":
      return /^\d+$/.test(valor.trim()) ? `${valor.trim()} portas` : valor; // "5" → "5 portas"
    case "cartype":
      // OLX é o vocabulário-alvo (Hatch/Sedã/SUV/Pick-up/Perua/Van/Utilitário).
      // ML: "Pick-Up"/"Van". Webmotors: "Utilitário esportivo"/"Hatchback"/"Picape"/"Perua/SW".
      return (
        {
          "Pick-Up": "Pick-up", // ML
          Van: "Van/Utilitário", // ML
          "Utilitário esportivo": "SUV", // Webmotors
          Hatchback: "Hatch", // Webmotors
          Picape: "Pick-up", // Webmotors
          "Perua/SW": "Perua", // Webmotors
        } as Record<string, string>
      )[valor] ?? valor;
    case "carcolor":
      if (valor === "Prateado") return "Prata";
      if (valor.startsWith("Cinza")) return "Cinza"; // "Cinza-escuro" → "Cinza"
      return valor;
    default:
      return valor;
  }
}

/**
 * Lê um campo canônico do mapa de atributos, cobrindo as chaves OLX e ML e
 * normalizando o valor. Retorna null quando o campo não foi informado.
 */
export function lerAtributo(
  atributos: MapaAtributos | null | undefined,
  campo: CampoCanonico
): string | null {
  if (!atributos) return null;
  const chaves = SINONIMOS[campo];
  if (BOOLEANO_OU.has(campo)) {
    let algum = false;
    for (const k of chaves) {
      const v = atributos[k]?.value;
      if (v === "Sim") return "Sim";
      if (v != null && v !== "") algum = true;
    }
    return algum ? "Não" : null;
  }
  for (const k of chaves) {
    const v = atributos[k]?.value;
    if (v != null && v !== "") return normalizarValor(campo, v);
  }
  return null;
}

/** Conveniência booleana pros indicadores/Procedência (campo === "Sim"). */
export function atributoSim(
  atributos: MapaAtributos | null | undefined,
  campo: CampoCanonico
): boolean {
  return lerAtributo(atributos, campo) === "Sim";
}

/** Conjunto de TODAS as chaves-fonte (OLX + ML) dos campos dados — usado pra
 *  excluir da lista de "detalhes extras" o que já entrou na ficha central. */
export function chavesFonte(campos: CampoCanonico[]): Set<string> {
  return new Set(campos.flatMap((c) => SINONIMOS[c]));
}
