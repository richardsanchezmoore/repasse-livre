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
const soDig = (v) => String(v || "").replace(/\D/g, "");

// Enriquecido com os sinais de clique do checkout nativo (fbp/fbc/fbclid capturados
// no nosso domínio) → match alto + atribuição de campanha correta. fbp/fbc vão CRUS
// (não hasheados); em/ph/external_id vão hasheados (SHA-256), como a Meta exige.
export async function enviarPurchaseCapi({ email, valor, moeda = "BRL", nomeConteudo = "Panfleto + Kit", eventId, telefone, fbp, fbc, fbclid, externalId, sourceUrl, pixelId, token, ddi = "55" }) {
  // pixelId/token opcionais: BR usa as envs padrão (comportamento inalterado); MX
  // passa META_PIXEL_ID_MX/META_CAPI_TOKEN_MX + ddi "52" (pixel separado por mercado).
  const pixel = pixelId || process.env.META_PIXEL_ID;
  const tok = token || process.env.META_CAPI_TOKEN;
  if (!pixel || !tok) return { ok: false, motivo: "capi_nao_configurado" };

  const user_data = {};
  if (email && String(email).includes("@")) user_data.em = [sha256(email)];
  const tel = soDig(telefone);
  if (tel.length >= 10) user_data.ph = [sha256(tel.startsWith(ddi) ? tel : ddi + tel)];
  if (externalId) user_data.external_id = [sha256(externalId)];
  if (fbp) user_data.fbp = fbp;
  // fbc = cookie _fbc; se não veio mas tem fbclid, constrói no formato fb.1.<ts>.<fbclid>.
  let _fbc = fbc || "";
  if (!_fbc && fbclid) _fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  if (_fbc) user_data.fbc = _fbc;

  const evento = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    // event_id = order_id: deduplica webhook repetido e um futuro Purchase no navegador.
    ...(eventId ? { event_id: String(eventId) } : {}),
    ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
    user_data,
    custom_data: { currency: moeda, value: Number(valor) || 0, content_name: nomeConteudo },
  };

  const corpo = { data: [evento] };
  if (process.env.META_CAPI_TEST_CODE) corpo.test_event_code = process.env.META_CAPI_TEST_CODE;

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${tok}`, {
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
