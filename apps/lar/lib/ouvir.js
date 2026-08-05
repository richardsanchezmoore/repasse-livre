"use client";
// Voz de ENTRADA (STT). Dois caminhos:
//  1) Servidor (Whisper) — grava o áudio (MediaRecorder) e manda pra /api/marta/ouvir.
//     Funciona no iPhone e no Android (só precisa de mic + HTTPS/localhost).
//  2) Web Speech API — reconhecimento nativo do navegador (Chrome/Android), sem chave.
//     Serve de fallback e pra testar sem custo. É furado no iOS — por isso o Whisper é o padrão.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** O navegador tem SpeechRecognition nativo? (fallback) */
export function webSpeechDisponivel() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** Pergunta ao servidor se o STT (Whisper) está configurado (tem chave). */
export async function sttServidorDisponivel() {
  try {
    const r = await fetch(BASE + "/api/marta/ouvir", { method: "GET", cache: "no-store" });
    const d = await r.json();
    return !!d?.disponivel;
  } catch { return false; }
}

/** Começa a gravar. Retorna um controlador com parar() → Promise<Blob>. */
export async function iniciarGravacao() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    cancelar() { try { rec.stop(); } catch {} stream.getTracks().forEach((t) => t.stop()); },
    parar() {
      return new Promise((resolve) => {
        rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" })); };
        try { rec.stop(); } catch { resolve(new Blob(chunks)); }
      });
    },
  };
}

/** Manda o áudio pro servidor transcrever. → { ok, texto } | { ok:false, semChave } */
export async function transcrever(blob) {
  const t = blob?.type || "";
  const ext = t.includes("mp4") || t.includes("m4a") ? "m4a" : t.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("audio", blob, "fala." + ext);
  const r = await fetch(BASE + "/api/marta/ouvir", { method: "POST", body: fd });
  return r.json();
}

/** Fallback Web Speech: escuta e devolve o texto. Retorna o objeto (com .stop()). */
export function ouvirWebSpeech({ onTexto, onFim, onErro }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onErro?.("indisponivel"); return null; }
  const rec = new SR();
  rec.lang = "pt-BR"; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
  rec.onresult = (e) => { const txt = e.results?.[0]?.[0]?.transcript || ""; onTexto?.(txt.trim()); };
  rec.onerror = (e) => onErro?.(e.error || "erro");
  rec.onend = () => onFim?.();
  try { rec.start(); } catch { onErro?.("start"); return null; }
  return rec;
}
