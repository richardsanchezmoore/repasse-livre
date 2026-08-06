import { criarSupabaseServer } from "./supabaseServer";

const PADRAO = [
  { nome: "Beber água", icone: "💧" },
  { nome: "Orar", icone: "🙏" },
  { nome: "Ler a Bíblia", icone: "📖" },
  { nome: "Me movimentar", icone: "🚶‍♀️" },
  { nome: "Um tempo só meu", icone: "🌷" },
];

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function segunda() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }

async function garantir(sb, userId) {
  const { count } = await sb.from("lar_habito").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count && count > 0) return;
  let ordem = 0;
  await sb.from("lar_habito").insert(PADRAO.map((h) => ({ user_id: userId, nome: h.nome, icone: h.icone, ordem: ordem++ })));
}

/** Hábitos ativos com: feito hoje, os 7 dias da semana e a sequência (streak). */
export async function carregarHabitos(userId) {
  const sb = await criarSupabaseServer();
  await garantir(sb, userId);
  const hoje = isoDe(new Date());
  const seg = segunda();
  const desde = isoDe(new Date(Date.now() - 40 * 86400000));
  const [{ data: habitos }, { data: logs }] = await Promise.all([
    sb.from("lar_habito").select("*").eq("user_id", userId).eq("ativo", true).order("ordem"),
    sb.from("lar_habito_log").select("habito_id, dia").eq("user_id", userId).gte("dia", desde),
  ]);
  const porHabito = {};
  for (const l of logs || []) (porHabito[l.habito_id] = porHabito[l.habito_id] || new Set()).add(l.dia);
  const semanaDias = [...Array(7)].map((_, i) => { const d = new Date(seg); d.setDate(d.getDate() + i); return isoDe(d); });

  return (habitos || []).map((h) => {
    const set = porHabito[h.id] || new Set();
    let streak = 0, d = new Date();
    if (!set.has(hoje)) d.setDate(d.getDate() - 1);
    while (set.has(isoDe(d))) { streak++; d.setDate(d.getDate() - 1); }
    return { id: h.id, nome: h.nome, icone: h.icone, feitoHoje: set.has(hoje), semana: semanaDias.map((dia) => set.has(dia)), streak };
  });
}
