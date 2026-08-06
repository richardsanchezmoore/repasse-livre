import { criarSupabaseServer } from "./supabaseServer";

const PADRAO = [
  { nome: "Cozinha", icone: "🍳", tarefas: [
    { nome: "Lavar a louça", freq: 1, min: 15 }, { nome: "Limpar o fogão", freq: 2, min: 10 },
    { nome: "Passar pano no chão", freq: 2, min: 10 }, { nome: "Tirar o lixo", freq: 1, min: 3 },
    { nome: "Limpar a geladeira", freq: 14, min: 20 },
  ] },
  { nome: "Sala", icone: "🛋️", tarefas: [
    { nome: "Varrer / aspirar", freq: 2, min: 10 }, { nome: "Tirar o pó", freq: 3, min: 10 }, { nome: "Organizar", freq: 1, min: 5 },
  ] },
  { nome: "Quarto", icone: "🛏️", tarefas: [
    { nome: "Arrumar a cama", freq: 1, min: 3 }, { nome: "Trocar a roupa de cama", freq: 7, min: 10 }, { nome: "Varrer o quarto", freq: 3, min: 8 },
  ] },
  { nome: "Banheiro", icone: "🚿", tarefas: [
    { nome: "Limpar vaso e pia", freq: 2, min: 10 }, { nome: "Limpar o box", freq: 7, min: 15 }, { nome: "Trocar as toalhas", freq: 4, min: 3 },
  ] },
  { nome: "Área de serviço", icone: "🧺", tarefas: [
    { nome: "Lavar roupa", freq: 2, min: 10 }, { nome: "Dobrar / guardar roupa", freq: 2, min: 15 },
  ] },
];

function segundaISO() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Nível de limpeza pela idade da tarefa: verde (em dia) → amarelo (venceu) → vermelho (atrasada/nunca). */
export function nivelTarefa(t) {
  const dias = t.ultima_vez ? (Date.now() - new Date(t.ultima_vez).getTime()) / 86400000 : 9999;
  const ratio = dias / Math.max(1, t.freq_dias);
  const nivel = ratio < 0.75 ? "verde" : ratio < 1.25 ? "amarelo" : "vermelho";
  return { nivel, urgencia: Math.round(dias - t.freq_dias) };
}

async function garantir(sb, userId) {
  const { count } = await sb.from("lar_casa_comodo").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count && count > 0) return;
  let ordem = 0;
  for (const c of PADRAO) {
    const { data: com } = await sb.from("lar_casa_comodo").insert({ user_id: userId, nome: c.nome, icone: c.icone, ordem: ordem++ }).select("id").maybeSingle();
    if (!com) continue;
    await sb.from("lar_casa_tarefa").insert(c.tarefas.map((t) => ({ user_id: userId, comodo_id: com.id, nome: t.nome, freq_dias: t.freq, minutos: t.min })));
  }
}

/** Carrega os cômodos com tarefas (nível calculado) + placar da semana. */
export async function carregarFaxina(userId) {
  const sb = await criarSupabaseServer();
  await garantir(sb, userId);
  const [{ data: comodos }, { data: tarefas }, { data: placar }] = await Promise.all([
    sb.from("lar_casa_comodo").select("*").eq("user_id", userId).eq("ativo", true).order("ordem"),
    sb.from("lar_casa_tarefa").select("*").eq("user_id", userId).eq("ativo", true),
    sb.from("lar_casa_semana").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const porComodo = {};
  for (const t of tarefas || []) {
    const n = nivelTarefa(t);
    (porComodo[t.comodo_id] = porComodo[t.comodo_id] || []).push({ id: t.id, nome: t.nome, minutos: t.minutos, freq_dias: t.freq_dias, ...n });
  }
  const lista = (comodos || []).map((c) => {
    const ts = (porComodo[c.id] || []).sort((a, b) => b.urgencia - a.urgencia);
    const nivel = ts.some((t) => t.nivel === "vermelho") ? "vermelho" : ts.some((t) => t.nivel === "amarelo") ? "amarelo" : "verde";
    return { id: c.id, nome: c.nome, icone: c.icone, nivel, tarefas: ts };
  });
  const semana = segundaISO();
  const minutosSemana = placar && placar.semana === semana ? placar.minutos : 0;
  return { comodos: lista, minutosSemana };
}
