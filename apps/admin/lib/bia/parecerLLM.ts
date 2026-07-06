import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { FactSheet } from "./tipos";

/**
 * Fase C do Copiloto — a PROSA do parecer via LLM.
 *
 * Princípio (validado com o usuário): **fatos determinísticos + LLM só pra
 * prosa**. Todo NÚMERO já foi calculado em código (o fact-sheet). O `copiloto`
 * determinístico (montarParecer em factSheet.ts) já monta o veredito + posição +
 * pilar com os números CERTOS — aqui a LLM só o REESCREVE em prosa natural de
 * especialista, podendo tecer as evidências e o nome do carro. Nunca inventa
 * número: o material factual é a fronteira.
 *
 * NÃO roda no acesso à página (era o delay ~4s). É chamada pelo script batch
 * `gerar:pareceres` (scripts/gerarPareceres.ts), que grava a prosa em
 * opportunities.copiloto_parecer; a página só LÊ. Lê ANTHROPIC_API_KEY do
 * ambiente; SEM chave ou em QUALQUER falha → retorna null (o chamador mantém o
 * parecer determinístico).
 *
 * Modelo: default claude-haiku-4-5 (7× mais barato e 2× mais rápido que Opus,
 * qualidade ~igual pra esta reescrita). Trocar via env COPILOTO_MODELO.
 */

const MODELO = process.env.COPILOTO_MODELO?.trim() || "claude-haiku-4-5";
// O Haiku 4.5 NÃO aceita output_config.effort (400). Opus/Sonnet aceitam.
const SUPORTA_EFFORT = !MODELO.startsWith("claude-haiku");

const SYSTEM = `Você é o Copiloto de Compra do Repasse Livre: um consultor automotivo experiente que avalia anúncios de carros usados aplicando a régua de especialistas com anos de atuação no mercado. Sua função é escrever um PARECER curto e instrutivo para um comprador leigo, a partir de um material de fatos JÁ VALIDADOS.

REGRAS INVIOLÁVEIS:
- Escreva SOMENTE com base no material fornecido. NUNCA invente, calcule nem estime números, percentuais, posições ou fatos que não estejam explícitos no material. Se um dado não está lá, ele não existe para você.
- O campo "parecer_base" já traz o veredito e os números corretos. Sua tarefa é REESCREVÊ-LO em prosa natural, clara e acolhedora de especialista — pode incorporar as evidências e o nome do veículo, mas sem acrescentar nenhum número novo.
- Se o material trouxer a POSIÇÃO/ranking (ex.: "na 4ª posição de melhor preço entre 31 veículos"), CITE o número EXATO no parecer — é um argumento de venda forte. NÃO generalize para "entre os melhores".
- Camadas de confiança: trate FATO (desconto sobre a FIPE, quilometragem) com firmeza; ESTIMATIVA com honestidade (diga "estimada"); PROXY como tendência, nunca como certeza.
- Tom: instrutivo e direto, como um especialista ao lado do comprador. SEM jargão técnico, SEM "N/D", SEM linguagem de máquina, SEM elogio vazio.
- Comece com o veredito em NEGRITO usando **asteriscos** (ex.: **Boa oportunidade.**).
- 2 a 3 frases, no máximo. Português do Brasil.
- Responda APENAS com o parecer final: sem introdução, sem aspas, sem comentários, sem cabeçalho.`;

export interface ContextoParecer {
  veiculo: string | null;
  ano: string | null;
}

/** Material de fatos que a LLM pode usar — só o que já foi validado. */
function montarMaterial(fs: FactSheet, ctx: ContextoParecer) {
  return {
    veiculo: ctx.veiculo,
    ano: ctx.ano,
    parecer_base: fs.copiloto, // já tem veredito + posição + pilar, com números certos
    avaliacoes: fs.fichas
      .filter((f) => f.estrelas != null)
      .map((f) => ({ categoria: f.categoria, estrelas: f.estrelas })),
    // Nota: NÃO enviamos fs.destaques — é cópia dos evidencias positivos (mesma
    // info, tokens de entrada à toa). O modelo já vê os positivos em evidencias.
    evidencias: fs.evidencias.map((e) => ({ tipo: e.tipo, texto: e.texto })),
  };
}

/**
 * Hash dos fatos que DIRIGEM a prosa (parecer-base determinístico + fichas +
 * evidências + veículo). O batch compara com o fingerprint gravado e só chama a
 * LLM quando muda — mantém a posição/percentil frescos sem custo à toa.
 */
export function fingerprintParecer(fs: FactSheet, ctx: ContextoParecer): string {
  const material = montarMaterial(fs, ctx);
  return createHash("sha1").update(JSON.stringify(material)).digest("hex");
}

/**
 * Reescreve o parecer em prosa via Claude. Retorna null quando não há chave ou
 * em qualquer erro — o chamador mantém o parecer determinístico.
 */
export async function gerarParecerLLM(fs: FactSheet, ctx: ContextoParecer): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 400,
      ...(SUPORTA_EFFORT ? { output_config: { effort: "low" as const } } : {}),
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(montarMaterial(fs, ctx)) }],
    });

    const bloco = resposta.content.find((b) => b.type === "text");
    const prosa = bloco?.type === "text" ? bloco.text.trim() : "";
    // Guarda de sanidade: precisa parecer um parecer (veredito em negrito).
    return prosa.length >= 20 && prosa.includes("**") ? prosa : null;
  } catch {
    return null;
  }
}
