import { criarSupabaseServer } from "./supabaseServer";

// Tipos de campo com nomes "comuns" (o que o admin vê) → tipo interno.
export const TIPOS_CAMPO = [
  { tipo: "input",    nome: "Texto curto",      escolha: false },
  { tipo: "textarea", nome: "Texto longo",      escolha: false },
  { tipo: "radio",    nome: "Escolha única",    escolha: true  },
  { tipo: "select",   nome: "Lista suspensa",   escolha: true  },
  { tipo: "checkbox", nome: "Múltipla escolha", escolha: true  },
  { tipo: "slider",   nome: "Escala (0–N)",     escolha: false },
];
export function nomeTipo(tipo) {
  return TIPOS_CAMPO.find((t) => t.tipo === tipo)?.nome || tipo;
}
export function tipoUsaOpcoes(tipo) {
  return !!TIPOS_CAMPO.find((t) => t.tipo === tipo)?.escolha;
}

/** Carrega etapas + campos (aninhados, ordenados). incluirInativos p/ o admin. */
export async function carregarEsquema(sb, { incluirInativos = false } = {}) {
  const client = sb || (await criarSupabaseServer());
  let qE = client.from("corte_etapas").select("*").order("ordem");
  let qC = client.from("corte_campos").select("*").order("ordem");
  if (!incluirInativos) { qE = qE.eq("ativo", true); qC = qC.eq("ativo", true); }
  const [{ data: etapas }, { data: campos }] = await Promise.all([qE, qC]);
  const porEtapa = {};
  for (const c of campos || []) (porEtapa[c.etapa_id] ||= []).push(c);
  return (etapas || []).map((e) => ({ ...e, campos: porEtapa[e.id] || [] }));
}

export function totalCampos(esquema) {
  return esquema.reduce((n, e) => n + e.campos.length, 0);
}

/** Uma resposta "conta" se tem valor não-vazio (string, número ou lista). */
export function respondida(valor) {
  if (valor == null) return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return String(valor).trim().length > 0;
}

/** Missão = lacuna: vazio OU respondido "Não sei". */
export function ehMissao(valor) {
  if (!respondida(valor)) return true;
  const s = Array.isArray(valor) ? valor.join(", ") : String(valor);
  return s.trim().toLowerCase() === "não sei";
}

/** Nível de Conhecimento: % + selo + mensagem-gatilho. */
export function nivel(respondidos, total) {
  const pct = total ? Math.round((respondidos / total) * 100) : 0;
  let selo, msg;
  if (pct === 0) { selo = "Curiosa"; msg = "Vocês mal cruzaram olhares. Abra o dossiê."; }
  else if (pct < 34) { selo = "Aprendiz"; msg = "Você ainda sabe pouco sobre seu futuro esposo."; }
  else if (pct < 67) { selo = "Observadora"; msg = "Está de olho — mas ainda há véus a descobrir."; }
  else if (pct < 100) { selo = "Investigadora"; msg = "Quase uma Lady Whistledown. Faltam poucos detalhes."; }
  else { selo = "Lady Whistledown"; msg = "Dossiê completo. Hora do Veredito."; }
  return { pct, selo, msg };
}

/** slug estável p/ a chave de um campo/etapa a partir do rótulo. */
export function slugChave(texto) {
  return String(texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 40) || "campo";
}
