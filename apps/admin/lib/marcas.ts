import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { extrairMarca } from "@/lib/marca";

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
    .eq("status", "aprovada")
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
