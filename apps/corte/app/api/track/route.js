import { NextResponse } from "next/server";
import { salvarTracking } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guarda los señales de atribución (fbp/fbc/fbclid/utm) ligados a una referencia
// propia (sck) generada en el checkout Hotmart. El webhook /api/hotmart lee esta
// referencia (que vuelve como `sck` en el payload) para enriquecer el Purchase del
// Meta CAPI (MX). Best-effort: nunca rompe el flujo de pago.
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const ref = String(b?.ref || "").trim();
  if (!ref) return NextResponse.json({ ok: false, motivo: "sin ref" });
  await salvarTracking(ref, {
    valor: b.valor,
    fbp: b.fbp, fbc: b.fbc, fbclid: b.fbclid,
    utm_source: b.utm_source, utm_medium: b.utm_medium,
    utm_campaign: b.utm_campaign, utm_content: b.utm_content, utm_term: b.utm_term,
  });
  return NextResponse.json({ ok: true });
}
