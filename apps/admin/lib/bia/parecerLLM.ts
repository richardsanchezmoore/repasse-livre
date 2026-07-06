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
 * SERVER-ONLY: importado só por lib/bia/dados.ts (que já é server-only). Lê
 * ANTHROPIC_API_KEY do ambiente. SEM chave ou em QUALQUER falha → retorna null,
 * e o chamador mantém o parecer-base determinístico (degrada gracioso; a página
 * nunca quebra). Ativar em produção = setar ANTHROPIC_API_KEY no Vercel.
 */

const MODELO = "claude-opus-4-8";

const SYSTEM = `Você é o Copiloto de Compra do Repasse Livre: um consultor automotivo experiente que avalia anúncios de carros usados aplicando a régua de especialistas com anos de atuação no mercado. Sua função é escrever um PARECER curto e instrutivo para um comprador leigo, a partir de um material de fatos JÁ VALIDADOS.

REGRAS INVIOLÁVEIS:
- Escreva SOMENTE com base no material fornecido. NUNCA invente, calcule nem estime números, percentuais, posições ou fatos que não estejam explícitos no material. Se um dado não está lá, ele não existe para você.
- O campo "parecer_base" já traz o veredito e os números corretos. Sua tarefa é REESCREVÊ-LO em prosa natural, clara e acolhedora de especialista — pode incorporar as evidências e o nome do veículo, mas sem acrescentar nenhum número novo.
- Camadas de confiança: trate FATO (desconto sobre a FIPE, quilometragem) com firmeza; ESTIMATIVA com honestidade (diga "estimada"); PROXY como tendência, nunca como certeza.
- Tom: instrutivo e direto, como um especialista ao lado do comprador. SEM jargão técnico, SEM "N/D", SEM linguagem de máquina, SEM elogio vazio.
- Comece com o veredito em NEGRITO usando **asteriscos** (ex.: **Boa oportunidade.**).
- 2 a 3 frases, no máximo. Português do Brasil.
- Responda APENAS com o parecer final: sem introdução, sem aspas, sem comentários, sem cabeçalho.`;

interface ContextoParecer {
  veiculo: string | null;
  ano: string | null;
}

/** Monta o material de fatos que a LLM pode usar — só o que já foi validado. */
function montarMaterial(fs: FactSheet, ctx: ContextoParecer) {
  return {
    veiculo: ctx.veiculo,
    ano: ctx.ano,
    parecer_base: fs.copiloto, // já tem veredito + posição + pilar, com números certos
    avaliacoes: fs.fichas
      .filter((f) => f.estrelas != null)
      .map((f) => ({ categoria: f.categoria, estrelas: f.estrelas })),
    evidencias: fs.evidencias.map((e) => ({ tipo: e.tipo, texto: e.texto })),
    destaques: fs.destaques,
  };
}

/**
 * Reescreve o parecer em prosa via Claude. Retorna null quando não há chave ou
 * em qualquer erro — o chamador então mantém o `copiloto` determinístico.
 */
export async function gerarParecerLLM(fs: FactSheet, ctx: ContextoParecer): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const material = montarMaterial(fs, ctx);

    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 400,
      output_config: { effort: "low" }, // tarefa simples de reescrita; prioriza latência/custo
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(material, null, 2) }],
    });

    const bloco = resposta.content.find((b) => b.type === "text");
    const prosa = bloco?.type === "text" ? bloco.text.trim() : "";
    // Guarda de sanidade: precisa parecer um parecer (com veredito em negrito),
    // senão volta pro determinístico.
    return prosa.length >= 20 && prosa.includes("**") ? prosa : null;
  } catch {
    return null;
  }
}
