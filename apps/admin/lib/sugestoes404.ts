import { extrairMarca } from "./marca";
import { gerarSlugCidade } from "./slug";
import { caminhoCidade, caminhoMarca } from "./site";
import { supabaseAdmin } from "./supabase";

const LIMITE_AMOSTRA = 1000;
const QUANTIDADE_SUGESTOES = 6;

export interface SugestaoLink {
  rotulo: string;
  caminho: string;
}

export interface Sugestoes404 {
  cidades: SugestaoLink[];
  marcas: SugestaoLink[];
}

/**
 * Cidades e marcas mais frequentes (numa amostra, não contagem exata — mesmo
 * princípio de buscarTagsMarcas em lib/tags.ts) pra sugerir como link na
 * página 404, em vez de deixar a pessoa sem nenhum caminho a seguir.
 */
export async function buscarSugestoes404(): Promise<Sugestoes404> {
  const { data } = await supabaseAdmin
    .from("opportunities")
    .select("veiculo, cidade, estado")
    .eq("status", "aprovada")
    .order("data_ordenacao", { ascending: false, nullsFirst: false })
    .limit(LIMITE_AMOSTRA);

  const linhas = data ?? [];

  const cidadesVistas = new Map<string, { rotulo: string; caminho: string; contagem: number }>();
  const marcasVistas = new Map<string, { rotulo: string; caminho: string; contagem: number }>();

  for (const linha of linhas) {
    const slugCidade = gerarSlugCidade(linha);
    if (slugCidade !== "sem-localizacao") {
      const atual = cidadesVistas.get(slugCidade);
      if (atual) {
        atual.contagem += 1;
      } else {
        cidadesVistas.set(slugCidade, {
          rotulo: `${linha.cidade} - ${linha.estado}`,
          caminho: caminhoCidade(linha),
          contagem: 1,
        });
      }
    }

    const marca = extrairMarca(linha.veiculo as string);
    if (marca) {
      const atual = marcasVistas.get(marca);
      if (atual) {
        atual.contagem += 1;
      } else {
        marcasVistas.set(marca, { rotulo: marca, caminho: caminhoMarca({}, marca), contagem: 1 });
      }
    }
  }

  const ordenarPorContagem = (mapa: Map<string, { rotulo: string; caminho: string; contagem: number }>) =>
    [...mapa.values()]
      .sort((a, b) => b.contagem - a.contagem)
      .slice(0, QUANTIDADE_SUGESTOES)
      .map(({ rotulo, caminho }) => ({ rotulo, caminho }));

  return {
    cidades: ordenarPorContagem(cidadesVistas),
    marcas: ordenarPorContagem(marcasVistas),
  };
}
