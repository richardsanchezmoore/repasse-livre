import { statusPedido } from "@/lib/caktoApi";

// GET /api/pix/status?id=<orderId> — polling do status pra saber quando pagou.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ ok: false, erro: "id ausente" }, { status: 400 });

  const r = await statusPedido(id);
  if (!r.ok) return Response.json({ ok: false }, { status: 502 });
  return Response.json({ ok: true, status: r.status, pago: r.pago });
}
