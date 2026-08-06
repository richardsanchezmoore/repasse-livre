import { NextResponse } from "next/server";

/** VOZ premium da Marta (TTS). GET=disponivel? / POST { texto } → áudio MP3.
 *  Provider trocável por env VOZ_PROVEDOR: "openai" (padrão) | "elevenlabs".
 *  Chaves: OpenAI reaproveita OPENAI_API_KEY (mesma do STT!); ElevenLabs=ELEVENLABS_API_KEY.
 *  Sem chave → { semChave } e o cliente cai na voz nativa (Web Speech). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROVEDOR = () => (process.env.VOZ_PROVEDOR || "openai").trim().toLowerCase();
function chave() {
  return PROVEDOR() === "elevenlabs"
    ? (process.env.ELEVENLABS_API_KEY || "").trim()
    : (process.env.VOZ_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

export async function GET() {
  return NextResponse.json({ disponivel: !!chave(), provedor: PROVEDOR() });
}

export async function POST(req) {
  const key = chave();
  if (!key) return NextResponse.json({ ok: false, semChave: true });

  let texto = "";
  try { const b = await req.json(); texto = String(b?.texto || "").slice(0, 1500); } catch {}
  if (!texto.trim()) return NextResponse.json({ ok: false, erro: "sem texto" }, { status: 400 });

  try {
    let resp;
    if (PROVEDOR() === "elevenlabs") {
      const voz = (process.env.VOZ_ID || "EXAVITQu4vr4xnSDxMaL").trim(); // trocar pela voz da marca
      const modelo = (process.env.VOZ_MODELO || "eleven_flash_v2_5").trim(); // Flash = mais barato
      resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ text: texto, model_id: modelo, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
    } else {
      const voz = (process.env.VOZ_ID || "shimmer").trim(); // voz feminina suave
      const modelo = (process.env.VOZ_MODELO || "gpt-4o-mini-tts").trim();
      resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: modelo, voice: voz, input: texto, response_format: "mp3" }),
      });
    }
    if (!resp.ok) {
      console.error("[voz]", PROVEDOR(), resp.status, (await resp.text()).slice(0, 200));
      return NextResponse.json({ ok: false, erro: "não consegui gerar a voz" }, { status: 502 });
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" },
    });
  } catch (e) {
    console.error("[voz] falhou:", e?.message);
    return NextResponse.json({ ok: false, erro: "erro na voz" }, { status: 502 });
  }
}
