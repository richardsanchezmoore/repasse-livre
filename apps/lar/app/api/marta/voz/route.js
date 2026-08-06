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
  if (provedor === "elevenlabs") return (process.env.ELEVENLABS_API_KEY || "").trim();
  if (provedor === "google") return (process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  return (process.env.VOZ_API_KEY || process.env.OPENAI_API_KEY || "").trim(); // openai
}

// Se faltar a chave do provedor preferido, cai no primeiro daqui que tiver chave.
const ORDEM_FALLBACK = ["google", "openai", "elevenlabs"];

function preferido(contexto) {
  if (contexto === "devocional") {
    return {
      // No começo o Google atende tudo; depois é só pôr VOZ_DEVOCIONAL_PROVEDOR=elevenlabs.
      provedor: (process.env.VOZ_DEVOCIONAL_PROVEDOR || "google").trim().toLowerCase(),
      voz: (process.env.VOZ_DEVOCIONAL_ID || "").trim(),
      modelo: (process.env.VOZ_DEVOCIONAL_MODELO || "").trim(),
    };
  }
  return {
    provedor: (process.env.VOZ_PROVEDOR || "google").trim().toLowerCase(),
    voz: (process.env.VOZ_ID || "").trim(),
    modelo: (process.env.VOZ_MODELO || "").trim(),
  };
}

/** Resolve provedor+chave pro contexto; se faltar chave, cai no 1º provedor com chave. */
function resolver(contexto) {
  const pref = preferido(contexto);
  if (chaveDe(pref.provedor)) return { ...pref, key: chaveDe(pref.provedor) };
  for (const p of ORDEM_FALLBACK) {
    const k = chaveDe(p);
    if (k) return { provedor: p, voz: "", modelo: "", key: k };
  }
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
  if (provedor === "google") {
    const v = voz || "pt-BR-Standard-C"; // padrão barato (~$4/1M) e agradável; trocar por VOZ_ID
    const lang = (v.match(/^[a-z]{2}-[A-Z]{2}/) || ["pt-BR"])[0];
    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { text: texto }, voice: { languageCode: lang, name: v }, audioConfig: { audioEncoding: "MP3" } }),
    });
    if (!r.ok) throw new Error("google " + r.status + " " + (await r.text()).slice(0, 150));
    const d = await r.json();
    if (!d?.audioContent) throw new Error("google sem audioContent");
    return Buffer.from(d.audioContent, "base64");
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
  const openai = !!chaveDe("openai"), elevenlabs = !!chaveDe("elevenlabs"), google = !!chaveDe("google");
  return NextResponse.json({ disponivel: openai || elevenlabs || google, openai, elevenlabs, google });
}

export async function POST(req) {
  let texto = "", contexto = "geral";
  try { const b = await req.json(); texto = String(b?.texto || "").slice(0, 1500); if (b?.contexto === "devocional") contexto = "devocional"; } catch {}
  if (!texto.trim()) return NextResponse.json({ ok: false, erro: "sem texto" }, { status: 400 });

  const cfg = resolver(contexto);
  if (!cfg) return NextResponse.json({ ok: false, semChave: true });
  // Voz padrão do Google por contexto (quando não veio por env): C no geral, D no devocional.
  if (cfg.provedor === "google" && !cfg.voz) cfg.voz = contexto === "devocional" ? "pt-BR-Standard-D" : "pt-BR-Standard-C";

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
