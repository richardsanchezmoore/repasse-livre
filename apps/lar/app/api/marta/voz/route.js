import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** VOZ premium da Marta (TTS) — HÍBRIDO por contexto:
 *   - contexto "devocional" → voz da marca (ElevenLabs por padrão), CACHEADA 1x/dia
 *     pra TODAS as usuárias (lar_config → custo ~0 mesmo no plano premium).
 *   - contexto "geral" (cardápio, rotina, fala, jogos) → voz barata (OpenAI por padrão).
 *  Se faltar a chave do provedor preferido, cai automaticamente no outro que tiver chave.
 *  Sem nenhuma chave → { semChave } e o cliente usa a voz nativa (Web Speech).
 *
 *  Envs: VOZ_PROVEDOR/VOZ_ID/VOZ_MODELO (geral) · VOZ_DEVOCIONAL_PROVEDOR/_ID/_MODELO
 *        Chaves: OPENAI_API_KEY (ou VOZ_API_KEY) · ELEVENLABS_API_KEY. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function chaveDe(provedor) {
  return provedor === "elevenlabs"
    ? (process.env.ELEVENLABS_API_KEY || "").trim()
    : (process.env.VOZ_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

function preferido(contexto) {
  if (contexto === "devocional") {
    return {
      provedor: (process.env.VOZ_DEVOCIONAL_PROVEDOR || "elevenlabs").trim().toLowerCase(),
      voz: (process.env.VOZ_DEVOCIONAL_ID || "").trim(),
      modelo: (process.env.VOZ_DEVOCIONAL_MODELO || "").trim(),
    };
  }
  return {
    provedor: (process.env.VOZ_PROVEDOR || "openai").trim().toLowerCase(),
    voz: (process.env.VOZ_ID || "").trim(),
    modelo: (process.env.VOZ_MODELO || "").trim(),
  };
}

/** Resolve provedor+chave pro contexto; se faltar chave, tenta o outro provedor. */
function resolver(contexto) {
  const pref = preferido(contexto);
  const key = chaveDe(pref.provedor);
  if (key) return { ...pref, key };
  const outro = pref.provedor === "elevenlabs" ? "openai" : "elevenlabs";
  const outraKey = chaveDe(outro);
  if (outraKey) return { provedor: outro, voz: "", modelo: "", key: outraKey };
  return null;
}

async function sintetizar({ provedor, key, voz, modelo, texto }) {
  if (provedor === "elevenlabs") {
    const v = voz || "EXAVITQu4vr4xnSDxMaL"; // padrão até definir a voz da marca
    const m = modelo || "eleven_flash_v2_5"; // Flash = mais barato
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: texto, model_id: m, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!r.ok) throw new Error("eleven " + r.status + " " + (await r.text()).slice(0, 150));
    return Buffer.from(await r.arrayBuffer());
  }
  const v = voz || "coral"; // voz feminina calorosa (padrão da Marta)
  const m = modelo || "gpt-4o-mini-tts";
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: m, voice: v, input: texto, response_format: "mp3" }),
  });
  if (!r.ok) throw new Error("openai " + r.status + " " + (await r.text()).slice(0, 150));
  return Buffer.from(await r.arrayBuffer());
}

const audioResp = (buf) =>
  new NextResponse(buf, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });

export async function GET() {
  const openai = !!chaveDe("openai"), elevenlabs = !!chaveDe("elevenlabs");
  return NextResponse.json({ disponivel: openai || elevenlabs, openai, elevenlabs });
}

export async function POST(req) {
  let texto = "", contexto = "geral";
  try { const b = await req.json(); texto = String(b?.texto || "").slice(0, 1500); if (b?.contexto === "devocional") contexto = "devocional"; } catch {}
  if (!texto.trim()) return NextResponse.json({ ok: false, erro: "sem texto" }, { status: 400 });

  const cfg = resolver(contexto);
  if (!cfg) return NextResponse.json({ ok: false, semChave: true });

  // Devocional: 1 áudio por dia pra TODAS (cache em lar_config).
  if (contexto === "devocional") {
    const chaveCache = "voz_devocional:" + new Date().toISOString().slice(0, 10);
    let admin = null;
    try {
      admin = supabaseAdmin();
      const { data } = await admin.from("lar_config").select("valor").eq("chave", chaveCache).maybeSingle();
      if (data?.valor?.mp3) return audioResp(Buffer.from(data.valor.mp3, "base64"));
    } catch (e) { console.error("[voz/devocional] leitura cache:", e?.message); }

    let buf;
    try { buf = await sintetizar({ ...cfg, texto }); }
    catch (e) { console.error("[voz]", e?.message); return NextResponse.json({ ok: false, erro: "não consegui gerar a voz" }, { status: 502 }); }

    if (admin) {
      try {
        await admin.from("lar_config").upsert(
          { chave: chaveCache, valor: { mp3: buf.toString("base64"), provedor: cfg.provedor, criado_em: new Date().toISOString() }, atualizado_em: new Date().toISOString() },
          { onConflict: "chave" }
        );
      } catch (e) { console.error("[voz/devocional] gravar cache:", e?.message); }
    }
    return audioResp(buf);
  }

  // Geral: gera direto (o cache por-usuária é no cliente).
  try {
    const buf = await sintetizar({ ...cfg, texto });
    return audioResp(buf);
  } catch (e) {
    console.error("[voz]", e?.message);
    return NextResponse.json({ ok: false, erro: "não consegui gerar a voz" }, { status: 502 });
  }
}
