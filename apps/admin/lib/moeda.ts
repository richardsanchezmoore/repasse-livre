/**
 * MOEDA E COTAÇÃO — o preço paraguaio em guarani, dólar e real.
 *
 * ★★★ A REGRA QUE ORGANIZA TUDO (decidida pelo Gustavo em 23/09/2026):
 *
 *   **o preço é um FATO na moeda de origem; o real é LEITURA.**
 *
 * No Paraguai o anúncio sai em guarani ou em dólar. Ninguém anuncia em real lá
 * dentro. Então:
 *   - guarda-se **preço + código da moeda** (é isso que vira base da tabela);
 *   - a tabela de referência é calculada **dentro de cada moeda**, sem converter;
 *   - a conversão para real acontece **na hora de exibir**, com a taxa do dia.
 *
 * ⚠️⚠️ NÃO GUARDAR COTAÇÃO HISTÓRICA NO BANCO. Ele me corrigiu nisso e estava
 * certo: taxa salva envelhece sozinha e passa a descrever um preço que nunca
 * existiu. O preço não muda; a taxa muda. Converter na exibição mantém o número
 * honesto e o histórico limpo.
 *
 * ⚠️ MOSTRAR COMO REFERÊNCIA, NUNCA COMO PROMESSA. No teste de 23/09 o bid dava
 * 1.000.000 Gs = R$ 836 e o ask R$ 889 — **6% de diferença**, que num carro de
 * R$ 100 mil são R$ 6 mil. E a taxa de mercado não é a que a casa de câmbio de
 * Ciudad del Este realmente paga. Por isso a conversão sai com "≈" e com a data
 * ao lado, e a margem do produto nunca depende dela.
 *
 * ★ O bug que isto conserta: `formatarMoeda` em lib/formatadores.ts chumba BRL.
 * Um carro de ₲220.000.000 aparecia no site como "R$ 220.000.000" — não é
 * arredondamento, é duas ordens de grandeza de erro, e estava no ar.
 */

export type CodigoMoeda = "PYG" | "USD" | "BRL";

export const MOEDA_PADRAO: CodigoMoeda = "PYG";

/** Normaliza o que vem do banco (pode ser nulo em registro antigo). */
export function normalizarMoeda(bruto?: string | null): CodigoMoeda {
  const m = String(bruto ?? "").trim().toUpperCase();
  if (m === "USD" || m === "PYG" || m === "BRL") return m;
  return MOEDA_PADRAO;
}

const SIMBOLO: Record<CodigoMoeda, string> = { PYG: "₲", USD: "US$", BRL: "R$" };

/**
 * Preço na própria moeda do anúncio.
 *
 * ⚠️ Guarani NÃO tem centavo (é a moeda com a menor unidade do continente), e
 * mostrar "₲ 22.000.000,00" entrega amadorismo para quem é de lá. Dólar e real
 * mantêm as duas casas.
 */
export function formatarNaMoeda(valor: number | null | undefined, moeda?: string | null): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  const m = normalizarMoeda(moeda);
  const casas = m === "PYG" ? 0 : 2;
  const n = valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return `${SIMBOLO[m]} ${n}`;
}

// ───────────────────────────────── cotação ─────────────────────────────────

export interface Cotacao {
  /** Quanto vale 1 unidade da moeda em REAIS. */
  porReal: Record<CodigoMoeda, number>;
  /** Quando a fonte gerou o número (não quando a gente pediu). */
  em: string;
  fonte: string;
}

/**
 * ★★ ORDEM DAS FONTES, invertida em 02/10/2026 depois de testar as duas.
 *
 * A AwesomeAPI era a primeira escolha de setembro porque entrega PYG→BRL
 * direto. Testada hoje: **HTTP 429, "QuotaExceeded"**. O plano grátis dela tem
 * cota e nós estourávamos — então ela vira RESERVA, não principal.
 *
 * A open.er-api respondeu 200 e, com base BRL, entrega os dois pares de uma
 * chamada só: `rates.PYG` é quantos guaranis valem 1 real e `rates.USD`
 * quantos dólares valem 1 real. Basta inverter.
 *
 * ★ Conferência que dá confiança no número: 1.000.000 ÷ 1.124,82 = **R$ 889**,
 * exatamente o valor que o Gustavo mediu à mão em 23/09. Duas fontes
 * independentes, meses diferentes, mesmo resultado.
 */
const FONTES: { nome: string; url: string; ler: (j: any) => Partial<Record<CodigoMoeda, number>> | null }[] = [
  {
    nome: "open.er-api",
    url: "https://open.er-api.com/v6/latest/BRL",
    // base BRL: rates.X = quantas unidades de X valem 1 real → invertemos
    ler: (j) => {
      const pyg = Number(j?.rates?.PYG), usd = Number(j?.rates?.USD);
      if (!Number.isFinite(pyg) || !Number.isFinite(usd) || pyg <= 0 || usd <= 0) return null;
      return { PYG: 1 / pyg, USD: 1 / usd };
    },
  },
  {
    nome: "AwesomeAPI",
    url: "https://economia.awesomeapi.com.br/json/last/PYG-BRL,USD-BRL",
    ler: (j) => {
      const pyg = Number(j?.PYGBRL?.bid), usd = Number(j?.USDBRL?.bid);
      if (!Number.isFinite(pyg) || !Number.isFinite(usd)) return null;
      return { PYG: pyg, USD: usd };
    },
  },
];

/**
 * Busca a cotação do dia, tentando as fontes em ordem.
 *
 * ⚠️ `revalidate: 3600` de propósito: a taxa do dia não precisa de precisão de
 * segundo — e sem cache cada visita de robô viraria uma chamada externa, que é
 * exatamente o desperdício que estourou o egress do Supabase em 02/10. Também
 * é o que mantém a gente longe da cota das duas APIs.
 *
 * Nunca lança: se todas caírem, devolve null e a tela mostra só a moeda de
 * origem. Preço sem conversão é incompleto; preço com conversão errada é
 * mentira.
 */
export async function buscarCotacao(): Promise<Cotacao | null> {
  for (const fonte of FONTES) {
    try {
      const r = await fetch(fonte.url, { next: { revalidate: 3600 } });
      if (!r.ok) continue;
      const taxas = fonte.ler(await r.json());
      if (!taxas?.PYG || !taxas?.USD) continue;
      return {
        porReal: { PYG: taxas.PYG, USD: taxas.USD, BRL: 1 },
        em: new Date().toISOString(),
        fonte: fonte.nome,
      };
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

/** Converte para real. Devolve null quando não dá para converter com honestidade. */
export function paraReal(
  valor: number | null | undefined,
  moeda: string | null | undefined,
  cotacao: Cotacao | null,
): number | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  const m = normalizarMoeda(moeda);
  if (m === "BRL") return valor;
  if (!cotacao) return null;
  const taxa = cotacao.porReal[m];
  if (!Number.isFinite(taxa) || taxa <= 0) return null;
  return valor * taxa;
}

/**
 * A linha de leitura em real: "≈ R$ 184.000".
 *
 * ★ O "≈" e o arredondamento para unidade são escolha, não descuido. Dar
 * centavo numa conversão com 6% de spread sugere uma precisão que não existe.
 */
export function formatarLeituraEmReal(
  valor: number | null | undefined,
  moeda: string | null | undefined,
  cotacao: Cotacao | null,
): string | null {
  const emReal = paraReal(valor, moeda, cotacao);
  if (emReal === null) return null;
  if (normalizarMoeda(moeda) === "BRL") return null;   // não repete a mesma moeda
  return `≈ ${emReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
}

/** Data curta da cotação, para ficar ao lado da leitura. */
export function dataDaCotacao(cotacao: Cotacao | null): string | null {
  if (!cotacao) return null;
  const d = new Date(String(cotacao.em).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
