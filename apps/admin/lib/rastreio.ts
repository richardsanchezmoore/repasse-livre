import { supabaseAdmin } from "./supabase";

export const CHAVES_RASTREIO = ["ga_measurement_id", "gtm_id", "meta_pixel_id", "scripts_extra"] as const;
export type ChaveRastreio = (typeof CHAVES_RASTREIO)[number];

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
