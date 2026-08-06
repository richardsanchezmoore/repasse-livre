import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Lista compartilhada por LINK (o token é a credencial). Quem tem o link (marido/
 *  família) marca e adiciona itens SEM login. Escrita via service role. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

async function listaDoToken(token) {
  if (!UUID.test(String(token || ""))) return null;
  const { data } = await supabaseAdmin().from("lar_lista").select("id").eq("token", token).maybeSingle();
  return data?.id || null;
}

export async function GET(req, { params }) {
  const listaId = await listaDoToken(params.token);
  if (!listaId) return NextResponse.json({ ok: false }, { status: 404 });
  const { data } = await supabaseAdmin().from("lar_lista_item").select("*").eq("lista_id", listaId).order("feito").order("criado_em");
  return NextResponse.json({ ok: true, itens: data || [] });
}

export async function POST(req, { params }) {
  const listaId = await listaDoToken(params.token);
  if (!listaId) return NextResponse.json({ ok: false, erro: "link inválido" }, { status: 404 });
  let body = {};
  try { body = await req.json(); } catch {}
  const admin = supabaseAdmin();
  const quem = String(body?.quem || "").trim().slice(0, 24) || "Família";

  if (body?.acao === "add") {
    const t = String(body?.texto || "").trim().slice(0, 120);
    if (!t) return NextResponse.json({ ok: false, erro: "vazio" }, { status: 400 });
    const { count } = await admin.from("lar_lista_item").select("id", { count: "exact", head: true }).eq("lista_id", listaId);
    if ((count || 0) >= 200) return NextResponse.json({ ok: false, erro: "lista cheia" }, { status: 400 });
    const { data } = await admin.from("lar_lista_item").insert({ lista_id: listaId, texto: t }).select("id").maybeSingle();
    return NextResponse.json({ ok: true, id: data?.id });
  }
  if (body?.acao === "toggle") {
    await admin.from("lar_lista_item").update({ feito: !!body.feito, feito_por: body.feito ? quem : null }).eq("id", body.id).eq("lista_id", listaId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 400 });
}
