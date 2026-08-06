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

// ─── MÓDULO FILHOS & VIRTUDES ────────────────────────────────────────────────
const SYSTEM_FILHOS = `Você é a Marta, assistente do lar de uma família cristã brasileira. Você ajuda a mãe a formar o CARÁTER dos filhos com leveza — hábitos e virtudes adequados à IDADE de cada criança, e um placar em que os pontos viram EXPERIÊNCIAS EM FAMÍLIA (nunca mais tempo de tela, nunca dinheiro).

PRINCÍPIOS:
- Para cada criança: uma VIRTUDE-foco e 3 hábitos concretos e observáveis, próprios da idade (criança pequena: guardar brinquedos, obedecer de primeira; maior: ler longe das telas, ajudar em casa, dizer a verdade).
- Um dos hábitos de cada criança deve reduzir tela (ex.: "ler 15 min longe do celular", "brincar lá fora").
- Recompensas: 4 a 6 ideias de experiências em FAMÍLIA e de baixo custo (piquenique, escolher o filme da noite, fazer bolo com a mãe, passeio no parque). Coletivas de preferência.
- Pode citar um princípio bíblico curto por criança como REFERÊNCIA (ex.: "Efésios 6:1"), sem transcrever versículo longo.

FORMATO — responda SOMENTE com JSON válido:
{
  "criancas": [ { "nome": "...", "idade": 8, "virtude": "Honestidade", "habitos": ["...", "...", "..."], "principio": "Provérbios 22:6" } ],
  "recompensas": ["...", "..."],
  "recado": "uma frase curta e calorosa (toque de fé, sem forçar)."
}
Português do Brasil. Use SOMENTE as crianças informadas.`;

export async function sugerirVirtudes({ filhos }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "Marta ainda está sem acesso (configure ANTHROPIC_API_KEY)." };
  const lista = (Array.isArray(filhos) ? filhos : [])
    .map((f) => ({ nome: String(f?.nome || "").trim(), idade: f?.idade != null ? Number(f.idade) : null }))
    .filter((f) => f.nome || f.idade != null);
  if (!lista.length) return { ok: false, erro: "Me diga o nome e a idade de pelo menos uma criança." };
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO, max_tokens: 2500, system: SYSTEM_FILHOS, messages: [{ role: "user", content: JSON.stringify({ criancas: lista }) }] }),
    });
    if (!resp.ok) { console.error("[marta/filhos] API", resp.status); return { ok: false, erro: "A Marta não conseguiu responder agora." }; }
    const data = await resp.json();
    const dados = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!dados || !Array.isArray(dados.criancas) || !dados.criancas.length) {
      return { ok: false, erro: "Não consegui montar agora. Tente de novo." };
    }
    return {
      ok: true,
      criancas: dados.criancas,
      recompensas: Array.isArray(dados.recompensas) ? dados.recompensas : [],
      recado: typeof dados.recado === "string" ? dados.recado : "",
    };
  } catch (e) {
    console.error("[marta/filhos] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente em instantes." };
  }
}

// ─── MÓDULO FINANÇAS DO LAR ──────────────────────────────────────────────────
// Os NÚMEROS são calculados em código (no cliente). A LLM só escreve a palavra de
// ânimo e 2-3 dicas práticas, SEM inventar valor (recebe os números já prontos).
const SYSTEM_FIN = `Você é a Marta, assistente do lar de uma família cristã brasileira, ajudando com as finanças da casa com serenidade e fé. Você recebe os NÚMEROS já calculados (renda, dízimo, gastos, sobra) e escreve: uma frase curta e acolhedora + 2 a 3 dicas práticas e realistas de economia doméstica. NUNCA invente ou recalcule números; use os que recebeu. Se a sobra for negativa, seja gentil e prática (onde cortar), sem julgar. Tom de conselheira cristã, leve.

FORMATO — SOMENTE JSON válido: { "recado": "...", "dicas": ["...", "...", "..."] }. Português do Brasil.`;

export async function palavraFinancas({ renda, dizimo, gastos, sobra }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false };
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 600, system: SYSTEM_FIN,
        messages: [{ role: "user", content: JSON.stringify({ renda, dizimo, total_gastos: gastos, sobra }) }],
      }),
    });
    if (!resp.ok) return { ok: false };
    const data = await resp.json();
    const d = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!d) return { ok: false };
    return { ok: true, recado: typeof d.recado === "string" ? d.recado : "", dicas: Array.isArray(d.dicas) ? d.dicas : [] };
  } catch (e) {
    console.error("[marta/fin] falhou:", e?.message);
    return { ok: false };
  }
}

// ─── FALA COM A MARTA (assistente única — entende e roteia) ──────────────────
const MODULOS_VALIDOS = ["cozinha", "casa", "filhos", "financas", "jogos", "agenda", "listas", "receitas", "habitos"];
const SYSTEM_FALA = `Você é a Marta, a assistente do lar de uma família cristã brasileira — calorosa, prática e sábia, como uma mulher experiente que já criou os filhos. A mãe pode te perguntar QUALQUER coisa do dia a dia: refeições, limpeza, filhos, casamento, finanças da casa, cansaço, fé.

Responda com carinho e MUITO objetiva — 2 a 4 frases, direto ao que ajuda. Se ela estiver desabafando, ACOLHA primeiro, depois dê um passo prático. Pode ter um toque de fé natural (sem forçar; NÃO transcreva versículos longos, no máximo uma referência curta).

Se a pergunta se encaixa num módulo do app, sugira ir pra lá:
- refeições/cardápio/o que cozinhar → "cozinha"
- limpeza/rotina/organizar a casa → "casa"
- filhos/educação/virtudes/comportamento → "filhos"
- contas/dinheiro/orçamento → "financas"
- brincar/jogo/quiz/diversão/entreter as crianças/atividade em família → "jogos"
- compromisso/consulta/agenda/marcar/lembrar de um evento/o que temos hoje ou essa semana → "agenda"
- lista de compras/lista de tarefas/anotar item/não esquecer de comprar → "listas"
- guardar/salvar/anotar uma receita/caderno de receitas → "receitas"
- cuidar de mim/meus hábitos/beber água/hábito pessoal da mãe → "habitos"
Senão, "modulo": null.

FORMATO — responda SOMENTE com JSON válido: { "resposta": "...", "modulo": "cozinha|casa|filhos|financas|null", "acao": "texto curto do botão ou null" }. Português do Brasil. NUNCA invente números.`;

export async function conversar({ pergunta, familia, historico }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "A Marta está sem acesso agora." };
  const p = String(pergunta || "").trim().slice(0, 800);
  if (!p) return { ok: false, erro: "Me conta o que você precisa. 💛" };
  try {
    const ctx = familia
      ? { nome_mae: familia.nome_mae || null, filhos: (familia.filhos || []).map((f) => ({ idade: f?.idade ?? null })), restricoes: familia.restricoes || null }
      : null;
    // memória: últimos turnos como contexto (ela lembra o que já falaram)
    const msgs = [];
    for (const m of (Array.isArray(historico) ? historico : []).slice(-6)) {
      msgs.push({ role: m?.papel === "marta" ? "assistant" : "user", content: String(m?.texto || "").slice(0, 500) });
    }
    while (msgs.length && msgs[0].role === "assistant") msgs.shift(); // precisa começar com 'user'
    msgs.push({ role: "user", content: JSON.stringify({ pergunta: p, familia: ctx }) });

    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO, max_tokens: 700, system: SYSTEM_FALA, messages: msgs }),
    });
    if (!resp.ok) { console.error("[marta/fala] API", resp.status); return { ok: false, erro: "A Marta não conseguiu responder agora." }; }
    const data = await resp.json();
    const d = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!d || !d.resposta) return { ok: false, erro: "Não entendi bem agora. Pode tentar de novo?" };
    const modulo = MODULOS_VALIDOS.includes(d.modulo) ? d.modulo : null;
    return { ok: true, resposta: String(d.resposta), modulo, acao: modulo && d.acao ? String(d.acao) : null };
  } catch (e) {
    console.error("[marta/fala] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente." };
  }
}

// ─── DEVOCIONAL DE 1 MINUTO ──────────────────────────────────────────────────
const SYSTEM_DEV = `Você é a Marta, escrevendo um devocional CURTÍSSIMO (1 minuto) para uma mãe cristã brasileira, aplicado à vida do lar e da família. Tom acolhedor e prático.

IMPORTANTE: NÃO transcreva o texto do versículo (direitos autorais). Dê apenas a REFERÊNCIA (ex.: "Salmos 127:1") — ela abre a própria Bíblia. Sua reflexão deve ser ORIGINAL, sua, com suas palavras.

FORMATO — SOMENTE JSON válido: { "tema": "2-3 palavras", "referencia": "Livro cap:vers", "reflexao": "2 a 3 frases originais aplicando ao lar/maternidade/casamento", "oracao": "uma oração curta de 1 frase" }. Português do Brasil.`;

export async function gerarDevocional() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO, max_tokens: 500, system: SYSTEM_DEV, messages: [{ role: "user", content: "Escreva o devocional de hoje." }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const d = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!d || !d.reflexao) return null;
    return {
      tema: String(d.tema || "Palavra de hoje"),
      referencia: String(d.referencia || ""),
      reflexao: String(d.reflexao),
      oracao: String(d.oracao || ""),
    };
  } catch (e) {
    console.error("[marta/dev] falhou:", e?.message);
    return null;
  }
}

// ─── ENTRETENIMENTO ──────────────────────────────────────────────────────────
// Jogo de fé em família: quiz bíblico (rejogável) + brincadeira SEM TELA pra fazerem
// juntos. Retém e vira aquisição (compartilha no WhatsApp). Copyright: perguntas sobre
// FATOS/personagens/histórias; explicações originais; referência (livro cap), NUNCA o
// texto do versículo.
const SYSTEM_JOGO = `Você é a Marta, assistente do lar de uma família cristã brasileira. Você cria um QUIZ BÍBLICO divertido pra família jogar junto.

PRINCÍPIOS:
- Perguntas sobre FATOS, personagens, histórias e ensinamentos da Bíblia (quem fez o quê, ordem dos acontecimentos, parábolas, milagres, virtudes). Nada de polêmica teológica/denominacional.
- Ajuste ao nível e à faixa: crianças = histórias conhecidas (Arca de Noé, Davi e Golias, Jonas, Natal); adultos = mais detalhe.
- Cada pergunta tem 4 alternativas e UMA correta ("correta" = índice 0 a 3). As erradas devem ser plausíveis, não absurdas.
- "explica": 1 frase curta e calorosa, em SUAS PALAVRAS, do porquê. Pode citar a referência (ex.: "Gênesis 6"), mas NUNCA transcreva o texto do versículo.
- Variedade: não repita o mesmo personagem/história nas perguntas.

FORMATO — responda SOMENTE com JSON válido (sem markdown):
{ "perguntas": [ { "pergunta": "...", "opcoes": ["...","...","...","..."], "correta": 0, "explica": "..." } ], "recado": "frase curta e animada da Marta pra começar o jogo" }
Português do Brasil.`;

const TEMAS_JOGO = ["Antigo Testamento", "Novo Testamento", "Mulheres da Bíblia", "Provérbios e sabedoria", "Milagres de Jesus", "Histórias para crianças", "Geral"];

export async function jogoBiblico({ tema, nivel, faixa, n } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "A Marta está sem acesso agora." };
  const qtd = Math.min(Math.max(Number(n) || 5, 3), 8);
  const temaOk = TEMAS_JOGO.includes(tema) ? tema : "Geral";
  const nivelOk = ["facil", "medio", "dificil"].includes(nivel) ? nivel : "medio";
  const faixaOk = ["criancas", "familia", "adultos"].includes(faixa) ? faixa : "familia";
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 2200, system: SYSTEM_JOGO,
        messages: [{ role: "user", content: JSON.stringify({ tema: temaOk, nivel: nivelOk, faixa: faixaOk, quantidade: qtd }) }],
      }),
    });
    if (!resp.ok) { console.error("[marta/jogo] API", resp.status); return { ok: false, erro: "A Marta não conseguiu criar o quiz agora." }; }
    const data = await resp.json();
    const d = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    const perguntas = (Array.isArray(d?.perguntas) ? d.perguntas : [])
      .map((q) => ({
        pergunta: String(q?.pergunta || "").trim(),
        opcoes: (Array.isArray(q?.opcoes) ? q.opcoes : []).map((o) => String(o || "").trim()).filter(Boolean).slice(0, 4),
        correta: Number.isInteger(q?.correta) ? q.correta : 0,
        explica: String(q?.explica || "").trim(),
      }))
      .filter((q) => q.pergunta && q.opcoes.length === 4 && q.correta >= 0 && q.correta < 4);
    if (!perguntas.length) return { ok: false, erro: "Não consegui montar o quiz agora. Tente de novo." };
    return { ok: true, perguntas, recado: String(d?.recado || "Vamos brincar e aprender juntas? 💛") };
  } catch (e) {
    console.error("[marta/jogo] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente." };
  }
}

const SYSTEM_BRINCA = `Você é a Marta, assistente do lar de uma família cristã brasileira. Você sugere UMA brincadeira em família, cristã e SEM TELA, pra fazerem juntos hoje.

PRINCÍPIOS:
- Simples, dentro de casa ou no quintal, com materiais que toda casa tem (papel, caneta, objetos comuns) — ou nenhum. Nada de comprar coisas.
- Adequada às idades dos filhos informados; que TODOS participem (inclusive o pai/marido).
- Ligada de forma leve a um valor ou história bíblica (ex.: mímica de histórias da Bíblia, caça ao tesouro com pistas de virtudes, roda de gratidão na mesa).
- Objetivo: unir a família e reduzir tela.
- Cite uma referência bíblica curta (livro cap) ligada ao valor, SEM transcrever o versículo.

FORMATO — responda SOMENTE com JSON válido:
{ "titulo": "...", "duracao": "~20 min", "materiais": ["..."], "comoJogar": ["passo 1", "passo 2", "passo 3"], "valor": "Gratidão", "referencia": "Salmos 100", "recado": "frase curta e calorosa" }
"materiais" pode ser ["nenhum"]. Português do Brasil.`;

export async function brincadeiraFamilia({ familia, tempo } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, erro: "A Marta está sem acesso agora." };
  try {
    const idades = (familia?.filhos || []).map((f) => f?.idade).filter((x) => x != null);
    const resp = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 900, system: SYSTEM_BRINCA,
        messages: [{ role: "user", content: JSON.stringify({ idades_dos_filhos: idades.length ? idades : "não informado", tempo: tempo === "rapido" ? "rapidinha (~10 min)" : "uma boa brincadeira (~25 min)" }) }],
      }),
    });
    if (!resp.ok) { console.error("[marta/brincadeira] API", resp.status); return { ok: false, erro: "A Marta não conseguiu sugerir agora." }; }
    const data = await resp.json();
    const d = parseJSON(data?.content?.find?.((b) => b.type === "text")?.text || "");
    if (!d?.titulo || !Array.isArray(d?.comoJogar) || !d.comoJogar.length) return { ok: false, erro: "Não consegui pensar numa agora. Tente de novo." };
    return {
      ok: true,
      titulo: String(d.titulo),
      duracao: String(d.duracao || ""),
      materiais: (Array.isArray(d.materiais) ? d.materiais : []).map((m) => String(m)).filter(Boolean),
      comoJogar: d.comoJogar.map((p) => String(p)).filter(Boolean),
      valor: String(d.valor || ""),
      referencia: String(d.referencia || ""),
      recado: String(d.recado || ""),
    };
  } catch (e) {
    console.error("[marta/brincadeira] falhou:", e?.message);
    return { ok: false, erro: "A Marta tropeçou agora. Tente novamente." };
  }
}
