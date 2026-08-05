import { criarSupabaseServer } from "./supabaseServer";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export function nomeDeHoje() { return DIAS[(new Date().getDay() + 6) % 7]; }
function segundaDaSemana() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** O DIA da usuária, cruzando o que ela salvou em cada módulo (cardápio, rotina, placar). */
export async function resumoHoje(userId) {
  const sb = await criarSupabaseServer();
  const semana = segundaDaSemana();
  const dia = nomeDeHoje();

  const [c, r, p] = await Promise.all([
    // Último cardápio salvo (não só o da semana atual) — o cardápio "expira" por semana,
    // a rotina não; sem isso o almoço sumia da home enquanto a faxina continuava aparecendo.
    sb.from("lar_cardapio").select("dados").eq("user_id", userId).order("inicio_semana", { ascending: false }).limit(1).maybeSingle(),
    sb.from("lar_rotina").select("dados").eq("user_id", userId).maybeSingle(),
    sb.from("lar_placar").select("dados, estrelas, semana").eq("user_id", userId).maybeSingle(),
  ]);

  const dc = (c.data?.dados?.dias || []).find((x) => x.dia === dia);
  const refeicao = dc ? { almoco: dc.almoco?.nome || null, jantar: dc.jantar?.nome || null } : null;

  const dr = (r.data?.dados?.semana || []).find((x) => x.dia === dia);
  const limpeza = dr ? { foco: dr.foco, tarefas: (dr.tarefas || []).map((t) => t.tarefa).filter(Boolean) } : null;
  const diarias = (r.data?.dados?.diarias || []).map((t) => t.tarefa).filter(Boolean);

  const nCriancas = p.data?.dados?.criancas?.length || 0;
  const placar = nCriancas
    ? { estrelas: p.data.semana === semana ? (p.data.estrelas || 0) : 0, criancas: nCriancas, meta: 12 }
    : null;

  return { dia, refeicao, limpeza, diarias, placar, temAlgo: !!(refeicao || limpeza || placar) };
}
