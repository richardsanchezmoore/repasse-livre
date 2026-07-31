// Avaliação do Veredito — cruza respostas do dossiê com as regras.
// Puro (sem imports de servidor): pode rodar no server ou no client.

export const CONDICOES = [
  { id: "preenchido", nome: "Está preenchido" },
  { id: "vazio",      nome: 'Vazio ou "não sei"' },
  { id: "igual",      nome: "É igual a…" },
  { id: "diferente",  nome: "É diferente de…" },
  { id: "contem",     nome: "Inclui a opção…" },
  { id: "nao_contem", nome: "Não inclui a opção…" },
  { id: "faixa",      nome: "Está na faixa (mín–máx)" },
];
export const BANDEIRAS = [
  { id: "verde",    rotulo: "🟢 Bom sinal" },
  { id: "amarelo",  rotulo: "🟡 Atenção" },
  { id: "vermelho", rotulo: "🔴 Alerta" },
  { id: "neutro",   rotulo: "⚪ Neutro" },
];
const PRIO = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };

const norm = (x) => String(x ?? "").trim().toLowerCase();
function respondida(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}
function ehNaoSei(v) {
  const s = Array.isArray(v) ? v.join(", ") : String(v ?? "");
  return norm(s) === "não sei" || norm(s) === "nao sei";
}

export function condicaoBate(condicao, valorRegra, resposta) {
  const opc = valorRegra?.opcao;
  switch (condicao) {
    case "preenchido": return respondida(resposta) && !ehNaoSei(resposta);
    case "vazio":      return !respondida(resposta) || ehNaoSei(resposta);
    case "igual":      return respondida(resposta) && !Array.isArray(resposta) && norm(resposta) === norm(opc);
    case "diferente":  return respondida(resposta) && !Array.isArray(resposta) && norm(resposta) !== norm(opc);
    case "contem":     return Array.isArray(resposta) && resposta.map(norm).includes(norm(opc));
    case "nao_contem": return respondida(resposta) && Array.isArray(resposta) && !resposta.map(norm).includes(norm(opc));
    case "faixa": {
      if (!respondida(resposta)) return false;
      const n = Number(resposta);
      if (Number.isNaN(n)) return false;
      const min = valorRegra?.min == null ? -Infinity : Number(valorRegra.min);
      const max = valorRegra?.max == null ? Infinity : Number(valorRegra.max);
      return n >= min && n <= max;
    }
    default: return false;
  }
}

/**
 * avaliarVeredito({ valores, regras, faixas })
 * valores: { [campo_id]: valor } · regras: linhas de corte_regras · faixas: array de {ate,rotulo,bandeira,mensagem}
 * → { total, faixa, sinais: [{bandeira, mensagem}], houveResposta }
 */
export function avaliarVeredito({ valores = {}, regras = [], faixas = [] }) {
  let total = 0;
  const sinais = [];
  for (const r of regras) {
    if (r.ativo === false) continue;
    const resposta = valores[r.campo_id];
    if (condicaoBate(r.condicao, r.valor, resposta)) {
      total += r.pontos || 0;
      if (r.mensagem) sinais.push({ bandeira: r.bandeira || "neutro", mensagem: r.mensagem });
    }
  }
  sinais.sort((a, b) => (PRIO[a.bandeira] ?? 9) - (PRIO[b.bandeira] ?? 9));

  const ordenadas = [...faixas].sort((a, b) => Number(a.ate) - Number(b.ate));
  let faixa = ordenadas.find((f) => total <= Number(f.ate)) || ordenadas[ordenadas.length - 1] || null;

  const houveResposta = Object.values(valores).some(respondida);
  return { total, faixa, sinais, houveResposta };
}
