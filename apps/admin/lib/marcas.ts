import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { extrairMarca } from "@/lib/marca";
import { PAIS_DO_SITE } from "@/lib/site";

/**
 * Lista de marcas da NOSSA base (ofertas aprovadas) com contagem, pro filtro de
 * Marca da vitrine — top por volume no grid, todas no modal "Ver todas". Não há
 * coluna `marca`: a marca é a 1ª palavra do `veiculo` (mesmo critério do
 * lib/marca.ts e das páginas SEO). Amostra + conta em memória (igual sitemap).
 * Cacheado (revalida a cada hora) — a lista muda devagar e não vale repetir a
 * varredura a cada request. Ver project_repasse_livre_painel_filtros.
 */

export interface MarcaContagem {
  marca: string;
  count: number;
}

const AMOSTRA = 6000;

async function computar(): Promise<MarcaContagem[]> {
  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("veiculo")
    .eq("status", "aprovada").eq("pais", PAIS_DO_SITE)
    .limit(AMOSTRA);
  if (error || !data) return [];

  // Agrupa CASE-INSENSITIVE (a mesma marca vem "Jeep" e "JEEP" nos títulos) →
  // soma as contagens e escolhe a grafia mais frequente como rótulo. Mesmo
  // princípio do buscarMarcaPorSlug. O filtro por ilike é case-insensitive, então
  // o rótulo canônico casa qualquer caixa.
  const grupos = new Map<string, Map<string, number>>();
  for (const linha of data) {
    const marca = extrairMarca((linha.veiculo as string) ?? "");
    if (!marca) continue;
    const chave = marca.toLowerCase();
    if (!grupos.has(chave)) grupos.set(chave, new Map());
    const grafias = grupos.get(chave)!;
    grafias.set(marca, (grafias.get(marca) ?? 0) + 1);
  }

  const resultado: MarcaContagem[] = [];
  for (const grafias of grupos.values()) {
    let total = 0;
    let rotulo = "";
    let melhor = -1;
    for (const [grafia, n] of grafias) {
      total += n;
      if (n > melhor) {
        melhor = n;
        rotulo = grafia;
      }
    }
    resultado.push({ marca: rotulo, count: total });
  }
  return resultado.sort((a, b) => b.count - a.count || a.marca.localeCompare(b.marca));
}

export const buscarMarcasComContagem = unstable_cache(computar, ["marcas-contagem-v1"], {
  revalidate: 3600,
});

/**
 * ★★ MODELOS com contagem, para os chips do topo.
 *
 * ⚠️ Diferente de `buscarMarcasComContagem`, que extrai a marca da 1ª palavra
 * do `veiculo` porque na era brasileira não havia coluna. No Paraguai o
 * normalizador preenche `modelo` em 96% — usar a coluna é mais certo e mais
 * barato que adivinhar pelo texto.
 *
 * ⚠️ Conta só o que a VITRINE mostra (com foto, sem reanúncio): oferecer um
 * chip que leva a uma lista vazia é o mesmo erro do filtro "Profissional",
 * que tinha zero anúncios e parecia o site quebrado.
 */
export interface ModeloContagem {
  modelo: string;
  count: number;
}

async function computarModelos(): Promise<ModeloContagem[]> {
  const contagem = new Map<string, number>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select("modelo")
      .eq("status", "aprovada")
      .eq("pais", PAIS_DO_SITE)
      .is("duplicata_de", null)
      .not("foto_principal", "is", null)
      .not("modelo", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) break;
    for (const l of data ?? []) {
      const m = String(l.modelo).trim();
      if (m) contagem.set(m, (contagem.get(m) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }
  return [...contagem.entries()]
    .map(([modelo, count]) => ({ modelo, count }))
    .sort((a, b) => b.count - a.count);
}

const modelosCache = unstable_cache(computarModelos, ["py-modelos-contagem"], { revalidate: 1800 });

export async function buscarModelosComContagem(): Promise<ModeloContagem[]> {
  return modelosCache();
}
