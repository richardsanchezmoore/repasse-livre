// Helpers de acesso (puros; recebem o client). Kit dá os materiais 'kit';
// assinatura dá tudo (kit + assinatura).

export async function acessosDaUsuaria(client, userId) {
  if (!userId) return new Set();
  const { data } = await client.from("corte_acessos").select("tipo, status, expira_em").eq("user_id", userId);
  const ativos = new Set();
  const agora = Date.now();
  for (const a of data || []) {
    const valido = a.status === "ativo" && (!a.expira_em || new Date(a.expira_em).getTime() > agora);
    if (valido) ativos.add(a.tipo);
  }
  return ativos;
}

export function temAcesso(acessos, nivelMaterial) {
  if (nivelMaterial === "livre") return true;
  if (nivelMaterial === "assinatura") return acessos.has("assinatura");
  // 'kit' (padrão): liberado por Kit OU por assinatura
  return acessos.has("kit") || acessos.has("assinatura");
}

/** Concede/renova um acesso (service role no webhook, ou admin). */
export async function concederAcesso(client, userId, tipo, { origem = "manual", referencia = null, expira_em = null } = {}) {
  return client.from("corte_acessos").upsert(
    { user_id: userId, tipo, status: "ativo", origem, referencia, expira_em, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id,tipo" }
  );
}

export async function revogarAcesso(client, userId, tipo) {
  return client.from("corte_acessos").update({ status: "cancelado", atualizado_em: new Date().toISOString() })
    .eq("user_id", userId).eq("tipo", tipo);
}
