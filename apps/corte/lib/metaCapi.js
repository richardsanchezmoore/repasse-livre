import crypto from "crypto";

/**
 * Envia um evento à API de Conversões da Meta (server-side). Usado no webhook da
 * Cakto pra o `Purchase` — o sinal mais confiável (imune a bloqueador/iOS), que
 * alimenta a otimização das campanhas. Sem token/pixel configurado, vira no-op.
 *
 * Config por env (Vercel): META_PIXEL_ID, META_CAPI_TOKEN e (opcional)
 * META_CAPI_TEST_CODE p/ testar no "Eventos de teste" do Gerenciador.
 */
const sha256 = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");

export async function enviarPurchaseCapi({ email, valor, moeda = "BRL", nomeConteudo = "Panfleto + Kit", eventId }) {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return { ok: false, motivo: "capi_nao_configurado" };

  const user_data = {};
  if (email && String(email).includes("@")) user_data.em = [sha256(email)];

  const evento = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    // event_id permite deduplicar se um dia dispararmos Purchase também no navegador.
    ...(eventId ? { event_id: eventId } : {}),
    user_data,
    custom_data: { currency: moeda, value: Number(valor) || 0, content_name: nomeConteudo },
  };

  const corpo = { data: [evento] };
  if (process.env.META_CAPI_TEST_CODE) corpo.test_event_code = process.env.META_CAPI_TEST_CODE;

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("[capi] erro:", JSON.stringify(j).slice(0, 300)); return { ok: false, resposta: j }; }
    return { ok: true, resposta: j };
  } catch (e) {
    console.error("[capi] falha de rede:", e?.message);
    return { ok: false, motivo: "rede" };
  }
}
