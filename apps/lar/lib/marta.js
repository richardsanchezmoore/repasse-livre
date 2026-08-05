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

// ─── MÓDULO ORDEM DA CASA ────────────────────────────────────────────────────
const SYSTEM_CASA = `Você é a Marta, assistente do lar de uma família cristã brasileira. Você monta uma ROTINA DE LIMPEZA leve e sustentável — a "faxina rotativa": um foco por dia, não a casa inteira todo dia. E você distribui as tarefas com justiça entre TODOS (a mãe não faz tudo sozinha), respeitando a idade das crianças.

PRINCÍPIOS:
- Diárias: pouquíssimas e rápidas (camas, louça, uma arrumada geral).
- Semana: cada dia tem UM foco (ex.: segunda cozinha, terça banheiros, quarta quartos…), com 1 a 3 tarefas.
- Distribua "quem" entre: "Você", "Marido" (se houver ajuda) e as crianças pelo nome/idade (tarefas adequadas à idade — criança pequena guarda brinquedos, maior ajuda na louça).
- Inclua um "Plano de Resgate": 3 a 5 microtarefas pra desafogar a casa em ~30 minutos quando bate o caos.

FORMATO — responda SOMENTE com JSON válido:
{
  "diarias": [ { "tarefa": "...", "quem": "..." } ],
  "semana": [ { "dia": "Segunda", "foco": "Cozinha", "tarefas": [ { "tarefa": "...", "quem": "..." } ] } ],
  "resgate": [ { "tarefa": "...", "minutos": 10 } ],
  "recado": "uma frase curta e calorosa (pode ter um toque de fé, sem forçar)."
}
Português do Brasil. Não invente membros da família além dos informados.`;

function materialCasa({ familia, comodos, ajudaMarido, tempo }) {
  const f = familia || {};
  const filhos = Array.isArray(f.filhos) ? f.filhos : [];
  return {
    comodos: (comodos || "").trim() || "casa comum (sala, cozinha, banheiros, quartos)",
    quem_ajuda: { marido: !!ajudaMarido, filhos: filhos.map((c) => ({ nome: c?.nome || null, idade: c?.idade ?? null })) },
    trabalha_fora: !!f.trabalha_fora,
    tempo_por_dia: tempo === "pouco" ? "pouco tempo por dia" : "consigo uma boa janela por dia",
  };
}

export async function planejarRotinaCasa(entrada) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "Marta ainda está sem acesso (configure ANTHROPIC_API_KEY)." };
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 3000, system: SYSTEM_CASA,
        messages: [{ role: "user", content: JSON.stringify(materialCasa(entrada)) }],
      }),
    });
    if (!resp.ok) { console.error("[marta/casa] API", resp.status); return { ok: false, erro: "A Marta não conseguiu responder agora." }; }
    const data = await resp.json();
    const dados = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!dados || (!Array.isArray(dados.semana) && !Array.isArray(dados.diarias))) {
      return { ok: false, erro: "Não consegui montar a rotina agora. Tente de novo." };
    }
    return {
      ok: true,
      diarias: Array.isArray(dados.diarias) ? dados.diarias : [],
      semana: Array.isArray(dados.semana) ? dados.semana : [],
      resgate: Array.isArray(dados.resgate) ? dados.resgate : [],
      recado: typeof dados.recado === "string" ? dados.recado : "",
    };
  } catch (e) {
    console.error("[marta/casa] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente em instantes." };
  }
}
