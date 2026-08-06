import { NextResponse } from "next/server";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Mídia da Sala (efêmera).
 *  POST (multipart {imagem, roda}) → sobe pro bucket privado sala-midia → { path, mime }.
 *  GET  (?path=) → streama a imagem (autenticada); 404 se já expirou/foi apagada. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "sala-midia";
const TIPOS = ["image/webp", "image/jpeg", "image/png"];
const MAX = 3 * 1024 * 1024; // 3MB (já vem comprimida)

async function usuaria() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  return data?.user || null;
}

export async function POST(req) {
  const user = await usuaria();
  if (!user) return NextResponse.json({ ok: false, erro: "Entre pra enviar foto." }, { status: 401 });

  let file, roda;
  try { const f = await req.formData(); file = f.get("imagem"); roda = String(f.get("roda") || "geral").replace(/[^a-z0-9-]/gi, ""); }
  catch { return NextResponse.json({ ok: false, erro: "envio inválido" }, { status: 400 }); }
  if (!file || typeof file === "string") return NextResponse.json({ ok: false, erro: "sem imagem" }, { status: 400 });
  if (!TIPOS.includes(file.type)) return NextResponse.json({ ok: false, erro: "formato não suportado" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, erro: "imagem muito grande" }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const nome = (globalThis.crypto?.randomUUID?.() || Date.now() + "" + Math.random().toString(16).slice(2));
  const path = `${roda}/${user.id}/${nome}.${ext}`;

  try {
    const admin = supabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
    if (error) { console.error("[sala/midia] upload", error.message); return NextResponse.json({ ok: false, erro: "não consegui subir a foto" }, { status: 502 }); }
    return NextResponse.json({ ok: true, path, mime: file.type });
  } catch (e) {
    console.error("[sala/midia] falhou:", e?.message);
    return NextResponse.json({ ok: false, erro: "erro no envio" }, { status: 502 });
  }
}

export async function GET(req) {
  const user = await usuaria();
  if (!user) return new NextResponse("", { status: 401 });
  const path = new URL(req.url).searchParams.get("path") || "";
  if (!path) return new NextResponse("", { status: 400 });

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.storage.from(BUCKET).download(path);
    if (error || !data) return new NextResponse("Mídia não está mais disponível", { status: 404 });
    const buf = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buf, { status: 200, headers: { "content-type": data.type || "image/webp", "cache-control": "private, max-age=120" } });
  } catch {
    return new NextResponse("Mídia não está mais disponível", { status: 404 });
  }
}
