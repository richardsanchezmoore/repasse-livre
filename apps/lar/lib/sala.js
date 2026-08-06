import { criarSupabaseServer } from "./supabaseServer";

// ── Regras de segurança (sem IA): bloqueio de dados pessoais e links ──
const RE_TEL = /(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}/;              // telefone BR
const RE_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;                        // CPF
const RE_LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|br|io|me|shop|store)\b)/i;

/** Detecta dado pessoal/golpe que não pode circular na Sala. */
export function checarTexto(t) {
  const s = String(t || "");
  if (RE_LINK.test(s)) return "Links não são permitidos na Sala (evita golpes). 💛";
  if (RE_CPF.test(s) || RE_TEL.test(s)) return "Por segurança, não compartilhe telefone ou CPF aqui — a conversa fica só dentro da Sala. 💛";
  return null;
}

export async function contextoSala() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user || null;
  if (!user) return { user: null, perfil: null };
  const { data: perfil } = await sb.from("lar_sala_perfil").select("*").eq("user_id", user.id).maybeSingle();
  return { user, perfil: perfil || null };
}

export async function listarRodas() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_rodas").select("*").eq("ativa", true).order("ordem");
  return data || [];
}

export async function rodaPorSlug(slug) {
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_rodas").select("*").eq("slug", slug).eq("ativa", true).maybeSingle();
  return data || null;
}

/** Últimas mensagens ativas de uma roda, em ordem cronológica. */
export async function mensagensRecentes(rodaId, limite = 60) {
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_mensagens")
    .select("id, user_id, tipo, texto, midia_path, responde_a, anonimo, autor_apelido, autor_avatar, destaque, criado_em")
    .eq("roda_id", rodaId).eq("status", "ativo")
    .order("criado_em", { ascending: false }).limit(limite);
  return (data || []).reverse();
}

/** Busca mensagens por texto (nas rodas). Filtra bloqueadas. */
export async function buscarMensagens(q, bloqueados = []) {
  const termo = String(q || "").trim();
  if (termo.length < 2) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_mensagens")
    .select("id, user_id, roda_id, texto, anonimo, autor_apelido, autor_avatar, criado_em")
    .eq("status", "ativo").ilike("texto", `%${termo.replace(/[%_]/g, "")}%`)
    .order("criado_em", { ascending: false }).limit(40);
  const bloq = new Set(bloqueados);
  return (data || []).filter((m) => !bloq.has(m.user_id));
}

/** Mensagens em destaque (curadoria da Marta) — vitrine da home. */
export async function destaquesRecentes(limite = 6) {
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_mensagens")
    .select("id, roda_id, texto, midia_path, anonimo, autor_apelido, autor_avatar, destaque_em")
    .eq("status", "ativo").eq("destaque", true)
    .order("destaque_em", { ascending: false }).limit(limite);
  return data || [];
}

/** Nº de avisos não lidos (pro badge). */
export async function contarAvisos(userId) {
  if (!userId) return 0;
  const sb = await criarSupabaseServer();
  const { count } = await sb.from("lar_sala_notif").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("lida", false);
  return count || 0;
}

/** Lista os avisos da usuária (mais recentes primeiro). */
export async function listarAvisos(userId, limite = 50) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_notif")
    .select("id, tipo, origem_apelido, preview, roda_slug, lida, criado_em")
    .eq("user_id", userId).order("criado_em", { ascending: false }).limit(limite);
  return data || [];
}

/** IDs que a usuária bloqueou (pra filtrar o conteúdo delas). */
export async function bloqueadosDe(userId) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_bloqueios").select("bloqueado_id").eq("user_id", userId);
  return (data || []).map((b) => b.bloqueado_id);
}
