import { NextResponse } from "next/server";

/** STT (voz de entrada): transcreve o áudio da usuária via Whisper (OpenAI).
 *  GET  → { disponivel } (o app usa pra decidir entre Whisper e o fallback nativo).
 *  POST → multipart { audio } → { ok, texto }.
 *  Chave: STT_API_KEY (ou OPENAI_API_KEY). Sem chave, o cliente cai no Web Speech. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAVE = () => (process.env.STT_API_KEY || process.env.OPENAI_API_KEY || "").trim();
const MODELO = () => (process.env.STT_MODELO || "whisper-1").trim();

export async function GET() {
  return NextResponse.json({ disponivel: !!CHAVE() });
}

export async function POST(req) {
  const key = CHAVE();
  if (!key) return NextResponse.json({ ok: false, semChave: true });

  let audio;
  try {
    const form = await req.formData();
    audio = form.get("audio");
  } catch {
    return NextResponse.json({ ok: false, erro: "áudio inválido" }, { status: 400 });
  }
  if (!audio || typeof audio === "string") {
    return NextResponse.json({ ok: false, erro: "sem áudio" }, { status: 400 });
  }

  try {
    const fd = new FormData();
    fd.append("file", audio, audio.name || "fala.webm");
    fd.append("model", MODELO());
    fd.append("language", "pt");
    fd.append("response_format", "json");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!r.ok) {
      console.error("[ouvir] whisper", r.status, (await r.text()).slice(0, 300));
      return NextResponse.json({ ok: false, erro: "não consegui transcrever" }, { status: 502 });
    }
    const d = await r.json();
    return NextResponse.json({ ok: true, texto: String(d?.text || "").trim() });
  } catch (e) {
    console.error("[ouvir] falhou:", e?.message);
    return NextResponse.json({ ok: false, erro: "falha na transcrição" }, { status: 502 });
  }
}
