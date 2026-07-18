import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Fonte das listas do form de Buscas salvas: marca/modelo/cidade que EXISTEM na
 * nossa base (RPCs buscas_modelos_cobertos / buscas_cidades_cobertas, mig 0048).
 * O form não aceita texto cru — o usuário escolhe daqui, senão um typo vira alerta
 * que nunca dispara. Cacheado 1h (a cobertura muda devagar; não vale varrer a cada
 * request — mesmo princípio de lib/marcas). Ver
 * project_repasse_livre_notificacoes_predefinicoes.
 */

export interface ModeloCobertura {
  marca: string;
  modelo: string;
  quantidade: number;
}
export interface CidadeCobertura {
  cidade: string;
  estado: string;
  quantidade: number;
}

async function computarModelos(): Promise<ModeloCobertura[]> {
  const { data, error } = await supabaseAdmin.rpc("buscas_modelos_cobertos");
  if (error || !data) return [];
  return (data as Array<{ marca: string; modelo: string; quantidade: number }>).map((r) => ({
    marca: r.marca,
    modelo: r.modelo,
    quantidade: Number(r.quantidade),
  }));
}
async function computarCidades(): Promise<CidadeCobertura[]> {
  const { data, error } = await supabaseAdmin.rpc("buscas_cidades_cobertas");
  if (error || !data) return [];
  return (data as Array<{ cidade: string; estado: string; quantidade: number }>).map((r) => ({
    cidade: r.cidade,
    estado: r.estado,
    quantidade: Number(r.quantidade),
  }));
}

export const buscarModelosCobertos = unstable_cache(computarModelos, ["cobertura-modelos-v1"], { revalidate: 3600 });
export const buscarCidadesCobertas = unstable_cache(computarCidades, ["cobertura-cidades-v1"], { revalidate: 3600 });

/** { marca → [modelos, do mais comum ao menos] } + a lista de marcas, pro combobox. */
export function agruparModelosPorMarca(linhas: ModeloCobertura[]): {
  marcas: string[];
  modelosPorMarca: Record<string, string[]>;
} {
  const mapa: Record<string, string[]> = {};
  for (const l of linhas) (mapa[l.marca] ??= []).push(l.modelo); // a RPC já ordena por quantidade desc
  return { marcas: Object.keys(mapa).sort(), modelosPorMarca: mapa };
}
/** { estado → [cidades cobertas, mais ativas primeiro] }. */
export function agruparCidadesPorEstado(linhas: CidadeCobertura[]): Record<string, string[]> {
  const mapa: Record<string, string[]> = {};
  for (const l of linhas) (mapa[l.estado] ??= []).push(l.cidade);
  return mapa;
}
