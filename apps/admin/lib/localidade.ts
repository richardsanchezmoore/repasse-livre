import {
  buscarCidadePorSlug,
  buscarEstadoPorSlug,
} from "@/components/DiscoveriesBoard";
import { NOME_POR_UF } from "./estados";
import { caminhoCidade, caminhoEstado, urlCidade, urlEstado } from "./site";

export interface LocalidadeResolvida {
  chaveSeo: "cidade" | "estado";
  nome: string;
  caminho: string;
  url: string;
  filtroCidade?: string;
  filtroEstado: string;
}

/**
 * Resolve o primeiro segmento de /carros/{cidadeUf}/... pra cidade ou
 * estado real — cidade exige sufixo "-uf" no slug (ver dividirSlugCidade),
 * então um slug de estado por extenso (sem esse sufixo) nunca colide.
 */
export async function resolverLocalidade(cidadeUf: string): Promise<LocalidadeResolvida | null> {
  const cidadeResolvida = await buscarCidadePorSlug(cidadeUf);
  if (cidadeResolvida) {
    return {
      chaveSeo: "cidade",
      nome: `${cidadeResolvida.cidade} ${NOME_POR_UF[cidadeResolvida.estado] ?? cidadeResolvida.estado}`,
      caminho: caminhoCidade(cidadeResolvida),
      url: urlCidade(cidadeResolvida),
      filtroCidade: cidadeResolvida.cidade,
      filtroEstado: cidadeResolvida.estado,
    };
  }

  const estadoResolvido = await buscarEstadoPorSlug(cidadeUf);
  if (estadoResolvido) {
    return {
      chaveSeo: "estado",
      nome: NOME_POR_UF[estadoResolvido.estado] ?? estadoResolvido.estado,
      caminho: caminhoEstado(estadoResolvido.estado),
      url: urlEstado(estadoResolvido.estado),
      filtroEstado: estadoResolvido.estado,
    };
  }

  return null;
}
