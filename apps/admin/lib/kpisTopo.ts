import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { buscarKpiMapeadasDias, buscarKpiNovosHoras } from "@/lib/configWorker";
import { PAIS_DO_SITE } from "@/lib/site";

/**
 * KPIs do topo do board — a "inteligência de mercado" que é o produto. Vem da RPC
 * `kpis_topo(dias_mapeadas, horas_novos)` (agregados no banco, um round-trip; ver
 * migration 0043). As janelas são configuráveis no painel: `dias_mapeadas` vale
 * pra "mapeadas" E "economia"; `horas_novos` pra "novos" (independente). Cacheado
 * por combinação de janelas (15/30min), cai num fallback se a RPC falhar.
 */
export interface KpisTopo {
  mapeados: number;
  abaixoFipe: number;
  novos: number;
  economia: number;
  /** Janelas efetivas — pras legendas dinâmicas. */
  mapeadasDias: number;
  novosHoras: number;
}

async function computar(dias: number, horas: number): Promise<Omit<KpisTopo, "mapeadasDias" | "novosHoras">> {
  // ⚠️ pais_filtro entrou na migração 0086 (03/10/2026): sem ele os quatro
  // números do topo eram a base INTEIRA — o Gustavo via 1.571 ofertas e
  // R$ 2,2 mi de economia brasileiros enquanto a listagem embaixo já mostrava
  // os 106 carros de Ciudad del Este.
  //
  // ⚠️⚠️ Isto NÃO conserta o significado de dois deles: "abaixo da FIPE" e
  // "economia" dependem de fipe_valor, que é NULO em 100% dos registros
  // paraguaios — no Paraguai não existe FIPE, que é a tese do produto. Com o
  // filtro eles devolvem 0 em vez de um número brasileiro: menos errado, ainda
  // não certo. O redesenho vai junto com a troca da "Margem".
  const { data, error } = await supabaseAdmin.rpc("kpis_topo", {
    dias_mapeadas: dias,
    horas_novos: horas,
    pais_filtro: PAIS_DO_SITE,
  });
  const linha = (data as { mapeados_7d: number; abaixo_fipe: number; novos_24h: number; economia_7d: number }[] | null)?.[0];
  if (error || !linha) return { mapeados: 0, abaixoFipe: 0, novos: 0, economia: 0 };
  return {
    mapeados: Number(linha.mapeados_7d) || 0,
    abaixoFipe: Number(linha.abaixo_fipe) || 0,
    novos: Number(linha.novos_24h) || 0,
    economia: Number(linha.economia_7d) || 0,
  };
}

// unstable_cache inclui os argumentos na chave → cada combinação de janelas
// cacheia separado (troca no painel reflete no próximo revalidate).
const computarCache = unstable_cache(computar, ["kpis-topo"], { revalidate: 1800 });

export async function buscarKpisTopo(): Promise<KpisTopo> {
  const [dias, horas] = await Promise.all([buscarKpiMapeadasDias(), buscarKpiNovosHoras()]);
  const k = await computarCache(dias, horas);
  return { ...k, mapeadasDias: dias, novosHoras: horas };
}

/**
 * ★ QUANTAS CIDADES A VARREDURA COBRE — o quarto KPI (14/10/2026).
 *
 * ⚠️ Pedido do Gustavo: *"falta um KPI para emparelhar no site"* — a grade já
 * era `repeat(4, 1fr)` e os três cartões existentes se esticavam.
 *
 * ★★ E a escolha do número não é arbitrária: "em todo o Paraguai" foi uma
 * frase REPROVADA antes justamente porque são as praças que varremos, não o
 * país inteiro. Dizer o número exato é a versão honesta da mesma promessa — e
 * mais forte, porque é verificável na própria listagem.
 *
 * ⚠️ Conta cidade da VITRINE, não praça cadastrada no painel: praça que não
 * rendeu anúncio nenhum não é cobertura, é intenção.
 */
async function contarCidades(): Promise<number> {
  const cidades = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select("cidade")
      .eq("pais", PAIS_DO_SITE)
      .eq("status", "aprovada")
      .is("duplicata_de", null)
      .not("cidade", "is", null)
      .not("foto_principal", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) return cidades.size;
    for (const r of data ?? []) if (r.cidade) cidades.add(String(r.cidade));
    if (!data || data.length < 1000) break;
  }
  return cidades.size;
}

const contarCidadesCache = unstable_cache(contarCidades, ["py-cidades-cobertas"], { revalidate: 1800 });

export async function buscarCidadesCobertas(): Promise<number> {
  return contarCidadesCache();
}
