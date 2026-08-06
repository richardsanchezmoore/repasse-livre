"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";
import { checarTexto } from "@/lib/sala";

const AVATARES = ["🌷", "🌻", "🌸", "🕊️", "💛", "🍒", "🌿", "☕", "📖", "🪴"];

/** Cria/atualiza o perfil da Sala e registra o aceite do termo. */
export async function garantirPerfil({ apelido, avatar }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Entre na sua conta pra participar da Sala." };

  const nome = String(apelido || "").trim().slice(0, 24);
  if (nome.length < 2) return { erro: "Escolha um apelido (mín. 2 letras)." };
  const av = AVATARES.includes(avatar) ? avatar : "🌷";

  const { error } = await sb.from("lar_sala_perfil").upsert(
    { user_id: user.id, apelido: nome, avatar: av, aceitou_termo_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { erro: error.message };
  return { ok: true };
}

const TTL_MIDIA_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Envia uma mensagem na roda (texto e/ou imagem). Snapshot do autor protege o anonimato. */
export async function enviarMensagem({ rodaId, texto, anonimo, respondeA, midiaPath, midiaMime }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const t = String(texto || "").trim().slice(0, 2000);
  const temMidia = !!midiaPath;
  if (!t && !temMidia) return { erro: "Escreva algo ou envie uma foto. 💛" };
  if (t) { const aviso = checarTexto(t); if (aviso) return { erro: aviso }; }

  const { data: perfil } = await sb.from("lar_sala_perfil").select("apelido, avatar, banido").eq("user_id", user.id).maybeSingle();
  if (!perfil) return { erro: "Complete o seu perfil da Sala primeiro." };
  if (perfil.banido) return { erro: "Sua participação está suspensa." };

  const anon = !!anonimo;
  const linha = {
    roda_id: rodaId,
    user_id: user.id,
    tipo: temMidia ? "imagem" : "texto",
    texto: t || null,
    midia_path: temMidia ? String(midiaPath) : null,
    midia_mime: temMidia ? String(midiaMime || "image/webp") : null,
    midia_expira_em: temMidia ? new Date(Date.now() + TTL_MIDIA_MS).toISOString() : null,
    responde_a: respondeA || null,
    anonimo: anon,
    // snapshot: se anônimo, NÃO grava o apelido real (vira "Uma irmã")
    autor_apelido: anon ? null : perfil.apelido,
    autor_avatar: anon ? "🌸" : (perfil.avatar || "🌷"),
  };
  const { data, error } = await sb.from("lar_sala_mensagens").insert(linha).select("id, criado_em").maybeSingle();
  if (error) return { erro: error.message.includes("rápido demais") ? error.message : "Não consegui enviar agora." };
  return { ok: true, id: data?.id, criado_em: data?.criado_em };
}

/** Reage a uma mensagem (curtir | amem | abraco | oro). Toggle. */
export async function reagir({ mensagemId, tipo }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Entre pra reagir." };
  const t = ["curtir", "amem", "abraco", "oro"].includes(tipo) ? tipo : "curtir";

  const { data: existe } = await sb.from("lar_sala_reacoes").select("tipo").eq("mensagem_id", mensagemId).eq("user_id", user.id).maybeSingle();
  if (existe && existe.tipo === t) {
    await sb.from("lar_sala_reacoes").delete().eq("mensagem_id", mensagemId).eq("user_id", user.id);
    return { ok: true, ativo: false };
  }
  await sb.from("lar_sala_reacoes").upsert({ mensagem_id: mensagemId, user_id: user.id, tipo: t }, { onConflict: "mensagem_id,user_id" });
  return { ok: true, ativo: true, tipo: t };
}

/** Denuncia uma mensagem (3 denúncias distintas auto-ocultam). */
export async function denunciar({ mensagemId, motivo }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Entre pra denunciar." };
  const { error } = await sb.from("lar_sala_denuncias").insert({ mensagem_id: mensagemId, denunciante_id: user.id, motivo: String(motivo || "").slice(0, 200) || null });
  if (error && !/duplicate|unique/i.test(error.message)) return { erro: "Não consegui registrar agora." };
  return { ok: true };
}

/** Bloqueia uma usuária (filtra o conteúdo dela pra mim). */
export async function bloquear({ bloqueadoId }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user || !bloqueadoId || bloqueadoId === user.id) return { erro: "Ação inválida." };
  await sb.from("lar_sala_bloqueios").upsert({ user_id: user.id, bloqueado_id: bloqueadoId }, { onConflict: "user_id,bloqueado_id" });
  return { ok: true };
}
