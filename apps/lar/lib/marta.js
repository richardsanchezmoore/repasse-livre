/**
 * MARTA — a assistente do lar. Módulo COZINHA: planeja o cardápio da semana.
 *
 * Mesmo princípio do Copiloto do Repasse Livre: a LLM gera o CONTEÚDO criativo
 * (os pratos), mas a ESTRUTURA é nossa — forçamos saída JSON, validamos, e
 * montamos a lista de compras de forma DETERMINÍSTICA (agrupada por seção do
 * mercado). Regras de segurança alimentar (restrições/alergias) são inegociáveis
 * no prompt. Modelo barato (Haiku) — custo de centavos por geração.
 *
 * NOTA: chamamos a API da Anthropic direto por `fetch` (não pelo SDK). O SDK
 * quebra no Node bleeding-edge local com "Premature close"; o fetch global
 * funciona igual local e na Vercel, sem dependência extra.
 */

const MODELO = process.env.MARTA_MODELO?.trim() || "claude-haiku-4-5-20251001";
const API = "https://api.anthropic.com/v1/messages";

const SECOES = ["Hortifrúti", "Açougue e ovos", "Laticínios e frios", "Mercearia", "Padaria", "Congelados", "Outros"];

const SYSTEM = `Você é a Marta, a assistente do lar de uma família cristã brasileira. Você planeja o cardápio da semana com carinho, bom senso e economia — como uma mulher experiente que já criou os filhos e sabe o que funciona numa casa de verdade.

PRINCÍPIOS:
- Comida brasileira, caseira e realista (arroz, feijão, carnes, legumes, ovos, massas). Nada de ingrediente exótico ou caro sem necessidade.
- Aproveite o que a família JÁ TEM em casa quando informado. Sugira reaproveitar sobras entre os dias.
- Porções para o tamanho da família informado. Priorize o custo-benefício.
- Se houver um domingo, capriche um pouco mais no almoço em família.

SEGURANÇA (INEGOCIÁVEL):
- RESPEITE À RISCA as restrições/alergias informadas. NUNCA inclua um ingrediente proibido, nem "traços" dele. Na dúvida, evite.

FORMATO — responda SOMENTE com um JSON válido (sem markdown, sem comentário, sem texto fora do JSON), nesta forma:
{
  "dias": [
    { "dia": "Segunda", "almoco": { "nome": "...", "ingredientes": [ { "item": "arroz", "qtd": "2 xíc.", "secao": "Mercearia" } ] }, "jantar": { "nome": "...", "ingredientes": [...] } }
  ],
  "recado": "uma frase curta, calorosa, no tom de uma conselheira cristã (pode ter um toque de fé, sem forçar)."
}
Cada ingrediente tem "item" (nome simples), "qtd" (quantidade aproximada) e "secao" (EXATAMENTE uma de: ${SECOES.join(", ")}). Português do Brasil.`;

function materialUsuario({ familia, ingredientes, dias, tempo }) {
  const f = familia || {};
  const filhos = Array.isArray(f.filhos) ? f.filhos : [];
  return {
    tamanho_familia: f.tamanho || (filhos.length + 2) || 4,
    idades_dos_filhos: filhos.map((c) => c?.idade).filter((x) => x != null),
    restricoes_ou_alergias: f.restricoes || "nenhuma",
    ingredientes_em_casa: (ingredientes || "").trim() || "não informado",
    dias_para_planejar: dias && dias.length ? dias : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
    estilo: tempo === "elaborado" ? "posso caprichar" : "receitas rápidas do dia a dia",
  };
}

/** Extrai o JSON da resposta (tolera cercas ```json). */
function parseJSON(texto) {
  if (!texto) return null;
  let t = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i >= 0 && j > i) t = t.slice(i, j + 1);
  try { return JSON.parse(t); } catch { return null; }
}

/** Monta a lista de compras determinística: consolida ingredientes e agrupa por seção. */
export function montarListaCompras(dias) {
  const mapa = new Map(); // item -> { item, qtds:[], secao }
  for (const d of dias || []) {
    for (const ref of [d?.almoco, d?.jantar]) {
      for (const ing of ref?.ingredientes || []) {
        const item = String(ing?.item || "").trim();
        if (!item) continue;
        const chave = item.toLowerCase();
        const secao = SECOES.includes(ing?.secao) ? ing.secao : "Outros";
        if (!mapa.has(chave)) mapa.set(chave, { item, qtds: [], secao });
        if (ing?.qtd) mapa.get(chave).qtds.push(String(ing.qtd));
      }
    }
  }
  const itens = [...mapa.values()].map((x) => ({ item: x.item, qtd: x.qtds.join(" + "), secao: x.secao, comprado: false }));
  const ordem = Object.fromEntries(SECOES.map((s, i) => [s, i]));
  itens.sort((a, b) => (ordem[a.secao] - ordem[b.secao]) || a.item.localeCompare(b.item));
  return itens;
}

/**
 * Planeja o cardápio via Marta. Retorna { ok, dias, recado, lista } ou { ok:false, erro }.
 * Sem ANTHROPIC_API_KEY ou em falha → ok:false (o chamador mostra mensagem amigável).
 */
export async function planejarCardapio(entrada) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "Marta ainda está sem acesso (configure ANTHROPIC_API_KEY)." };

  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(materialUsuario(entrada)) }],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("[marta] API", resp.status, t.slice(0, 200));
      return { ok: false, erro: "A Marta não conseguiu responder agora. Tente de novo em instantes." };
    }

    const data = await resp.json();
    const texto = data?.content?.find?.((b) => b.type === "text")?.text || "";
    const dados = parseJSON(texto);
    if (!dados || !Array.isArray(dados.dias) || !dados.dias.length) {
      console.error("[marta] parse falhou. stop_reason=", data?.stop_reason, "| len=", texto.length, "| tail=", JSON.stringify(texto.slice(-160)));
      return { ok: false, erro: "Não consegui montar o cardápio agora. Tente de novo." };
    }
    return {
      ok: true,
      dias: dados.dias,
      recado: typeof dados.recado === "string" ? dados.recado : "",
      lista: montarListaCompras(dados.dias),
    };
  } catch (e) {
    console.error("[marta] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente em instantes." };
  }
}
