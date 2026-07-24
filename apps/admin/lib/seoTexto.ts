import { supabaseAdmin } from "@/lib/supabase";
import type { ContextoSeo, TipoSeo } from "@/lib/seoTextoLLM";

/**
 * Leitura da prosa de SEO gravada pelo batch (gerar:seo-textos). A página só LÊ —
 * a geração via LLM roda fora do request (ver seoTextoLLM). Retorna null se ainda
 * não houver texto gerado (ou se a tabela não existir) → o chamador cai no template.
 */
export async function buscarSeoTexto(tipo: TipoSeo, chave: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("seo_textos")
      .select("texto")
      .eq("tipo", tipo)
      .eq("chave", chave)
      .maybeSingle();
    return (data?.texto as string | undefined) ?? null;
  } catch {
    return null; // tabela ainda não migrada / erro transitório → template
  }
}

/**
 * Template determinístico de fallback — usado enquanto o batch não gerou a prosa
 * única (ou se a LLM falhar). Curto, correto e razoavelmente único por recorte;
 * a versão LLM (mais rica) o substitui assim que o batch roda.
 */
export function textoSeoFallback(ctx: ContextoSeo): string {
  // Fecho-ponte CURTO (≤300 no total — a lista é o principal). "O Repasse Livre" (masc.).
  const ponte =
    "O Repasse Livre reúne OLX, Mercado Livre e Facebook e mostra só os que valem a pena, com preço, margem e análise prontos pra você decidir antes dos outros.";
  switch (ctx.tipo) {
    case "modelo":
      return `${ctx.marca} ${ctx.modelo} abaixo da tabela FIPE em ${ctx.localidade}. ${ponte}`;
    case "marca":
      return `Ofertas de ${ctx.marca} abaixo da FIPE em ${ctx.localidade}. ${ponte}`;
    case "cidade":
    case "estado":
    default:
      return `Carros abaixo da tabela FIPE em ${ctx.localidade}. ${ponte}`;
  }
}
