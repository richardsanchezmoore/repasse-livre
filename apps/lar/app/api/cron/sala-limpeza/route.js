import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Limpeza da mídia efêmera: apaga do bucket as imagens vencidas (>30d). NÃO apaga o
 *  caminho na mensagem — quem já baixou continua vendo (cache do aparelho); quem não
 *  baixou recebe 404 → "Mídia não está mais disponível". Agenda no deploy (Vercel Cron).
 *  Protegido por CRON_SECRET (header Authorization: Bearer, ou ?secret=). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "sala-midia";

function autorizado(req) {
  const seg = (process.env.CRON_SECRET || "").trim();
  if (!seg) return true; // sem segredo (dev) → liberado
  const h = req.headers.get("authorization") || "";
  const q = new URL(req.url).searchParams.get("secret") || "";
  return h === `Bearer ${seg}` || q === seg;
}

export async function GET(req) {
  if (!autorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = supabaseAdmin();

  const { data } = await admin.from("lar_sala_mensagens")
    .select("id, midia_path")
    .not("midia_path", "is", null)
    .lt("midia_expira_em", new Date().toISOString())
    .limit(500);
  const alvos = data || [];
  if (!alvos.length) return NextResponse.json({ ok: true, apagadas: 0 });

  try { await admin.storage.from(BUCKET).remove(alvos.map((m) => m.midia_path)); }
  catch (e) { console.error("[sala-limpeza] remove:", e?.message); }

  // zera só o TTL (não reprocessa) — mantém o midia_path pra o placeholder/cache do device
  await admin.from("lar_sala_mensagens").update({ midia_expira_em: null }).in("id", alvos.map((m) => m.id));
  return NextResponse.json({ ok: true, apagadas: alvos.length });
}
