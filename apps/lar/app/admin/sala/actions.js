"use server";

import { checarModerador } from "@/lib/moderacao";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function guarda() { return (await checarModerador()).moderadora; }

/** Remove a mensagem (some pra todas) e resolve as denúncias. */
export async function removerMensagem(id) {
  if (!await guarda()) return { erro: "Sem permissão." };
  const admin = supabaseAdmin();
  await admin.from("lar_sala_mensagens").update({ status: "removido", denuncias: 0 }).eq("id", id);
  await admin.from("lar_sala_denuncias").update({ status: "resolvida", resolvido_em: new Date().toISOString() }).eq("mensagem_id", id);
  return { ok: true };
}

/** Descarta as denúncias e mantém/reexibe a mensagem. */
export async function dispensarDenuncias(id) {
  if (!await guarda()) return { erro: "Sem permissão." };
  const admin = supabaseAdmin();
  await admin.from("lar_sala_mensagens").update({ status: "ativo", denuncias: 0 }).eq("id", id);
  await admin.from("lar_sala_denuncias").update({ status: "descartada", resolvido_em: new Date().toISOString() }).eq("mensagem_id", id);
  return { ok: true };
}

/** Suspende a autora (não posta mais). Usa o user_id real, mesmo em post anônimo. */
export async function banirAutora(userId) {
  if (!await guarda()) return { erro: "Sem permissão." };
  await supabaseAdmin().from("lar_sala_perfil").update({ banido: true }).eq("user_id", userId);
  return { ok: true };
}

export async function desbanirAutora(userId) {
  if (!await guarda()) return { erro: "Sem permissão." };
  await supabaseAdmin().from("lar_sala_perfil").update({ banido: false }).eq("user_id", userId);
  return { ok: true };
}

/** Destaca (ou tira o destaque de) uma mensagem — curadoria da Marta. */
export async function destacarMensagem(id, on) {
  if (!await guarda()) return { erro: "Sem permissão." };
  await supabaseAdmin().from("lar_sala_mensagens")
    .update({ destaque: !!on, destaque_em: on ? new Date().toISOString() : null }).eq("id", id);
  return { ok: true };
}
