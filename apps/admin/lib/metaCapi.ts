import { createHash } from "crypto";

/**
 * Conversions API (CAPI) da Meta — envia eventos servidor→servidor pra Graph API. Complementa
 * o Pixel do navegador: sobrevive a adblock/iOS e captura o que o navegador não vê (ex.: o
 * Purchase acontece no domínio da Ticto, fora do nosso Pixel).
 *
 * Dormente até configurar as envs (retorna sem fazer nada) — seguro pra deployar antes:
 *  - META_PIXEL_ID:   1034519139443180 (não é segredo; fica em env por organização)
 *  - META_CAPI_TOKEN: access token gerado no Events Manager → Conversions API (SEGREDO)
 *  - META_CAPI_TEST_CODE (opcional): pra os eventos aparecerem em "Test Events" no teste
 *
 * A Meta exige os dados do usuário HASHEADOS (SHA-256) — nunca mandamos e-mail/telefone crus.
 */

const GRAPH_VERSION = "v21.0";

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}
/** e-mail normalizado (trim + minúsculo) e hasheado; undefined se inválido. */
function hashEmail(e?: string | null): string | undefined {
  const s = (e ?? "").trim().toLowerCase();
  return s.includes("@") ? sha256(s) : undefined;
}
/** telefone só-dígitos e hasheado; undefined se curto demais. */
function hashPhone(p?: string | null): string | undefined {
  const s = (p ?? "").replace(/\D/g, "");
  return s.length >= 10 ? sha256(s) : undefined;
}

export interface EventoCapi {
  /** Standard Event da Meta, ex.: "Purchase". */
  evento: string;
  /** id do evento — pra dedup com o Pixel (se um dia espelharmos o mesmo evento no cliente). */
  eventId: string;
  email?: string | null;
  phone?: string | null;
  /** nosso user_id — vira external_id (hasheado) pra casar o usuário. */
  externalId?: string | null;
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
}

/**
 * Envia UM evento pro CAPI. Best-effort: nunca lança (o chamador — ex.: webhook de
 * pagamento — não pode quebrar por causa de tracking). Loga falha e segue.
 */
export async function enviarEventoCapi(ev: EventoCapi): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!pixelId || !token) return; // dormante até configurar

  const user_data: Record<string, unknown> = {};
  const em = hashEmail(ev.email);
  if (em) user_data.em = [em];
  const ph = hashPhone(ev.phone);
  if (ph) user_data.ph = [ph];
  if (ev.externalId) user_data.external_id = [sha256(String(ev.externalId))];

  const testCode = process.env.META_CAPI_TEST_CODE?.trim();
  const corpo = {
    data: [
      {
        event_name: ev.evento,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        event_source_url: ev.eventSourceUrl,
        user_data,
        custom_data:
          ev.value != null ? { value: ev.value, currency: ev.currency ?? "BRL" } : undefined,
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("[capi] falha:", res.status, txt.slice(0, 300));
    }
  } catch (e) {
    console.error("[capi] erro de rede:", e instanceof Error ? e.message : e);
  }
}
