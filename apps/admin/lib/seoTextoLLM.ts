import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Prosa de SEO das páginas de CATEGORIA (cidade/estado/marca/modelo) via LLM.
 * MESMA filosofia do Copiloto (parecerLLM): fatos determinísticos + LLM só pra
 * prosa; NÃO roda no acesso à página — é chamada pelo batch gerar:seo-textos, que
 * grava em seo_textos. A página só LÊ. Sem ANTHROPIC_API_KEY ou em qualquer falha
 * → retorna null (o chamador cai no template).
 *
 * Modelo: default claude-haiku-4-5 (barato/rápido, qualidade ótima pra um parágrafo
 * curto de marketing — mesmo racional do Copiloto). Trocar via env SEO_TEXTO_MODELO
 * (ex.: claude-opus-4-8 pra prosa mais rica).
 */

const MODELO = process.env.SEO_TEXTO_MODELO?.trim() || "claude-haiku-4-5";
const SUPORTA_EFFORT = !MODELO.startsWith("claude-haiku"); // Haiku 4.5 recusa output_config.effort (400)

export type TipoSeo = "cidade" | "estado" | "marca" | "modelo";

export interface ContextoSeo {
  tipo: TipoSeo;
  /** Nome por extenso do recorte: "Porto Alegre, Rio Grande do Sul" ou "Rio Grande do Sul". */
  localidade: string;
  marca?: string | null;
  modelo?: string | null;
  /** Nº de ofertas atualmente na página (dá concretude; é o único número que a LLM pode citar). */
  total: number;
  /** Marcas mais frequentes no recorte (páginas de cidade/estado). */
  marcasTop?: string[];
}

const SYSTEM = `Você escreve o parágrafo de abertura (SEO) de páginas de categoria da Repasse Livre — uma plataforma que agrega anúncios de carros usados de OLX, Mercado Livre e Facebook Marketplace e destaca os que estão ABAIXO da tabela FIPE, com a margem de ganho já calculada.

Sua tarefa: escrever UM parágrafo único, natural e informativo para a página descrita, cruzando três coisas: (1) o carro/marca e sua expressão no mercado brasileiro de usados, (2) a cidade ou estado onde está sendo exibido, (3) o valor da Repasse Livre (garimpar as fontes e mostrar só o que vale, abaixo da FIPE).

REGRAS:
- 200 a 400 caracteres. Português do Brasil. Tom humano de especialista, direto e acolhedor.
- Texto CORRIDO (sem listas, sem títulos, sem markdown, sem emoji, sem aspas).
- Use as palavras-chave de forma NATURAL (o nome do carro/marca + a localidade + "abaixo da FIPE").
- NUNCA invente número. Se um total de ofertas for informado, pode citá-lo; fora isso, nenhum número.
- NÃO comece com "Bem-vindo", "Nesta página", "Confira" nem clichê de IA. Comece pelo assunto.
- Responda APENAS com o parágrafo final — sem introdução, sem comentário, sem cabeçalho.`;

function montarMaterial(ctx: ContextoSeo) {
  return {
    tipo: ctx.tipo,
    localidade: ctx.localidade,
    ...(ctx.marca ? { marca: ctx.marca } : {}),
    ...(ctx.modelo ? { modelo: ctx.modelo } : {}),
    total_de_ofertas: ctx.total,
    ...(ctx.marcasTop && ctx.marcasTop.length ? { marcas_frequentes: ctx.marcasTop } : {}),
  };
}

/** Hash dos fatos que dirigem a prosa — o batch só regera quando muda (total é arredondado
 *  em dezenas pra não regenerar a cada oferta nova). */
export function fingerprintSeo(ctx: ContextoSeo): string {
  const material = { ...montarMaterial(ctx), total_de_ofertas: Math.round(ctx.total / 10) * 10 };
  return createHash("sha1").update(JSON.stringify(material)).digest("hex");
}

export async function gerarSeoTextoLLM(ctx: ContextoSeo): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 400,
      ...(SUPORTA_EFFORT ? { output_config: { effort: "low" as const } } : {}),
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(montarMaterial(ctx)) }],
    });

    const bloco = resposta.content.find((b) => b.type === "text");
    const texto = bloco?.type === "text" ? bloco.text.trim() : "";
    // Guarda de sanidade: parágrafo de verdade, sem markdown/lista.
    if (texto.length < 120 || texto.length > 700) return null;
    if (/^[#\-*>]|\n[#\-*]/.test(texto)) return null;
    return texto;
  } catch {
    return null;
  }
}
