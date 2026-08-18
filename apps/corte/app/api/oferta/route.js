import { precoOferta } from "@/lib/caktoApi";
import { offerIdAtivo } from "@/lib/caktoOferta";
import { calcularParcelas } from "@/lib/parcelas";

// GET /api/oferta — preço + parcelas da oferta ATIVA (fonte da verdade = Cakto).
// O checkout consome isto pra mostrar sempre o valor real, sem preço chumbado.
export const runtime = "nodejs";
export const revalidate = 120;

export async function GET() {
  try {
    const offerId = await offerIdAtivo();
    const info = await precoOferta(offerId);
    const precoNum = info?.price || 0;
    if (!precoNum) return Response.json({ ok: false }, { status: 502 });
    const valor = "R$ " + precoNum.toFixed(2).replace(".", ",");
    const parcelas = calcularParcelas(precoNum, 4);
    return Response.json(
      { ok: true, precoNum, valor, parcelas },
      { headers: { "cache-control": "public, max-age=120, s-maxage=120" } }
    );
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
