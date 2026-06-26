import { supabaseAdmin } from "./supabase";
import type { ChaveSeoPagina, ConfigSeoPagina } from "./seoVariaveis";

export type { ChaveSeoPagina, ConfigSeoPagina } from "./seoVariaveis";
export { CHAVES_SEO_PAGINAS, VARIAVEIS_SEO, substituirVariaveisSeo } from "./seoVariaveis";

export async function buscarConfigSeo(chave: ChaveSeoPagina): Promise<ConfigSeoPagina | null> {
  const { data } = await supabaseAdmin.from("seo_paginas").select("*").eq("chave", chave).maybeSingle();
  return data ?? null;
}

export async function buscarTodasConfigsSeo(): Promise<ConfigSeoPagina[]> {
  const { data } = await supabaseAdmin.from("seo_paginas").select("*");
  return data ?? [];
}

/**
 * Foto de capa pra Open Graph de páginas de listagem (cidade/estado/marca/
 * home) — usa a foto real do anúncio mais recente do recorte em vez de
 * pedir uma imagem genérica no painel admin (a foto do carro já é mais
 * relevante pra quem recebe o link do que qualquer imagem fixa seria).
 */
export async function buscarFotoDestaque(filtro: {
  cidade?: string;
  estado?: string;
  marca?: string;
}): Promise<string | null> {
  let consulta = supabaseAdmin
    .from("opportunities")
    .select("foto_principal")
    .eq("status", "aprovada")
    .not("foto_principal", "is", null);
  if (filtro.estado) consulta = consulta.eq("estado", filtro.estado);
  if (filtro.cidade) consulta = consulta.eq("cidade", filtro.cidade);
  if (filtro.marca) consulta = consulta.ilike("veiculo", `${filtro.marca}%`);
  consulta = consulta.order("data_ordenacao", { ascending: false, nullsFirst: false }).limit(1);

  const { data } = await consulta;
  return (data?.[0]?.foto_principal as string | undefined) ?? null;
}
