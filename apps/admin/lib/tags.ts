import { extrairMarca } from "./marca";
import { supabaseAdmin } from "./supabase";

const LIMITE_AMOSTRA = 500;
const QUANTIDADE_TAGS = 3;

/**
 * Marcas mais frequentes num recorte de cidade ou estado, pra alimentar a
 * variável $tags nos modelos de SEO (ver lib/seo.ts) — calculado a partir de
 * uma amostra (não da tabela toda) só pra estimar as mais comuns, não pra
 * contagem exata.
 */
export async function buscarTagsMarcas(filtro: { cidade?: string; estado: string }): Promise<string> {
  let consulta = supabaseAdmin
    .from("opportunities")
    .select("veiculo")
    .eq("status", "aprovada")
    .eq("estado", filtro.estado)
    .limit(LIMITE_AMOSTRA);
  if (filtro.cidade) {
    consulta = consulta.eq("cidade", filtro.cidade);
  }

  const { data, error } = await consulta;
  if (error) {
    throw new Error(`Falha ao buscar marcas: ${error.message}`);
  }

  const contagemPorMarca = new Map<string, number>();
  for (const linha of data ?? []) {
    const marca = extrairMarca(linha.veiculo as string);
    if (!marca) continue;
    contagemPorMarca.set(marca, (contagemPorMarca.get(marca) ?? 0) + 1);
  }

  return [...contagemPorMarca.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, QUANTIDADE_TAGS)
    .map(([marca]) => marca)
    .join(", ");
}
