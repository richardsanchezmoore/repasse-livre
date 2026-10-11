import { supabaseAdmin } from "./supabase";
import type { ChaveSeoPagina, ConfigSeoPagina } from "./seoVariaveis";
import { PAIS_DO_SITE } from "@/lib/site";

export type { ChaveSeoPagina, ConfigSeoPagina } from "./seoVariaveis";
export { CHAVES_SEO_PAGINAS, VARIAVEIS_SEO, substituirVariaveisSeo } from "./seoVariaveis";

/**
 * ★★ TÍTULO E DESCRIÇÃO POR IDIOMA (mig 0095). A aba do navegador dizia
 * "Carros abaixo da tabela FIPE", em português, num site paraguaio — e não era
 * código: vem desta tabela, que não conhecia idioma.
 *
 * ⚠️ CAI PARA es SE NÃO ACHAR a linha do idioma pedido. Metadado faltando
 * em português é melhor servido pelo espanhol (a praça) do que por nada —
 * página sem título o Google inventa um, e normalmente escolhe mal.
 */
export async function buscarConfigSeo(
  chave: ChaveSeoPagina,
  idioma: "es" | "pt" = "es",
): Promise<ConfigSeoPagina | null> {
  const { data } = await supabaseAdmin
    .from("seo_paginas").select("*").eq("chave", chave).eq("idioma", idioma).maybeSingle();
  if (data) return data;
  if (idioma === "es") return null;
  const { data: fallback } = await supabaseAdmin
    .from("seo_paginas").select("*").eq("chave", chave).eq("idioma", "es").maybeSingle();
  return fallback ?? null;
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
    .eq("status", "aprovada").eq("pais", PAIS_DO_SITE)
    .not("foto_principal", "is", null);
  if (filtro.estado) consulta = consulta.eq("estado", filtro.estado);
  if (filtro.cidade) consulta = consulta.eq("cidade", filtro.cidade);
  if (filtro.marca) consulta = consulta.ilike("veiculo", `${filtro.marca}%`);
  consulta = consulta.order("data_ordenacao", { ascending: false, nullsFirst: false }).limit(1);

  const { data } = await consulta;
  return (data?.[0]?.foto_principal as string | undefined) ?? null;
}
