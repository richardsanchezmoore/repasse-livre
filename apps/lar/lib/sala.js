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
    .select("id, user_id, tipo, texto, midia_path, responde_a, anonimo, autor_apelido, autor_avatar, criado_em")
    .eq("roda_id", rodaId).eq("status", "ativo")
    .order("criado_em", { ascending: false }).limit(limite);
  return (data || []).reverse();
}

/** IDs que a usuária bloqueou (pra filtrar o conteúdo delas). */
export async function bloqueadosDe(userId) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_sala_bloqueios").select("bloqueado_id").eq("user_id", userId);
  return (data || []).map((b) => b.bloqueado_id);
}
