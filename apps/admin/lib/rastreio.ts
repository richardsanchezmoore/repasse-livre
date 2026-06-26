import { supabaseAdmin } from "./supabase";
import { CHAVES_RASTREIO, type ChaveRastreio } from "./rastreioVariaveis";

export { CHAVES_RASTREIO } from "./rastreioVariaveis";
export type { ChaveRastreio } from "./rastreioVariaveis";

export interface ConfigRastreio {
  chave: string;
  valor: string;
}

export async function buscarConfigRastreio(): Promise<Record<ChaveRastreio, string>> {
  const { data } = await supabaseAdmin.from("config_rastreio").select("chave, valor");
  const configs = Object.fromEntries((data ?? []).map((linha) => [linha.chave, linha.valor])) as Record<
    string,
    string
  >;
  return Object.fromEntries(CHAVES_RASTREIO.map((chave) => [chave, configs[chave] ?? ""])) as Record<
    ChaveRastreio,
    string
  >;
}
