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
  // Fecho-ponte: reforça o VALOR (contexto/análise/alerta antecipado) e empurra pra
  // decisão — vira ponte pra página de vendas, além do SEO. "O Repasse Livre" (masc.).
  const ponte =
    "O Repasse Livre garimpa OLX, Mercado Livre e Facebook e reúne aqui só os que valem a pena, com preço, margem, FIPE e o ganho já calculados. O anúncio comum vira decisão: enquanto muita gente ainda pesquisa, você já viu a análise e sabe se vale comprar.";
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
