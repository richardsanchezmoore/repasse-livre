// Access helpers (pure; receive the client). Kit grants the 'kit' materials;
// subscription grants everything (kit + subscription). Tables namespaced `ca_`.

export async function acessosDaUsuaria(client, userId) {
  if (!userId) return new Set();
  const { data } = await client.from("ca_acessos").select("tipo, status, expira_em").eq("user_id", userId);
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
  // 'kit' (default): unlocked by Kit OR by subscription
  return acessos.has("kit") || acessos.has("assinatura");
}

/** Grants/renews an access (service role in the webhook, or admin). */
export async function concederAcesso(client, userId, tipo, { origem = "manual", referencia = null, expira_em = null } = {}) {
  return client.from("ca_acessos").upsert(
    { user_id: userId, tipo, status: "ativo", origem, referencia, expira_em, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id,tipo" }
  );
}

export async function revogarAcesso(client, userId, tipo) {
  return client.from("ca_acessos").update({ status: "cancelado", atualizado_em: new Date().toISOString() })
    .eq("user_id", userId).eq("tipo", tipo);
}
