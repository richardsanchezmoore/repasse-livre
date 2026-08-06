"use client";

/**
 * A VOZ da Marta — camada única e trocável. Mesma API pros componentes:
 *   falar(texto, {onInicio,onFim}) · pararFala() · vozDisponivel()
 *
 * Ordem: tenta a VOZ PREMIUM (servidor /api/marta/voz → MP3, ElevenLabs/OpenAI)
 * e, se não houver chave OU falhar, cai na Web Speech nativa (grátis, robótica).
 * O áudio premium é cacheado no cliente por texto (replay não recobra a API).
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// ── premium (servidor) ──────────────────────────────────────────────────────
let _premiumProm = null;
function _checarPremium() {
  if (_premiumProm) return _premiumProm;
  _premiumProm = fetch(BASE + "/api/marta/voz", { method: "GET", cache: "no-store" })
    .then((r) => r.json()).then((d) => !!d?.disponivel).catch(() => false);
  return _premiumProm;
}

const _cache = new Map(); // hash(texto) -> objectURL do MP3
function _hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "v" + h; }

let _audio = null;

async function _falarPremium(texto, { onInicio, onFim } = {}) {
  const chave = _hash(texto);
  let url = _cache.get(chave);
  if (!url) {
    const r = await fetch(BASE + "/api/marta/voz", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const tipo = r.headers.get("content-type") || "";
    if (!r.ok || !tipo.includes("audio")) throw new Error("sem audio premium");
    const blob = await r.blob();
    if (!blob?.size) throw new Error("audio vazio");
    url = URL.createObjectURL(blob);
    _cache.set(chave, url);
  }
  _audio = new Audio(url);
  let fimOk = false; const fim = () => { if (!fimOk) { fimOk = true; onFim && onFim(); } };
  _audio.onended = fim; _audio.onerror = fim;
  onInicio && onInicio();
  await _audio.play(); // pode rejeitar (autoplay iOS) → quem chama faz fallback
}

// ── nativa (Web Speech) ─────────────────────────────────────────────────────
let _vozes = [];
function _carregar() { try { _vozes = window.speechSynthesis?.getVoices?.() || []; } catch { _vozes = []; } }
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  _carregar();
  window.speechSynthesis.onvoiceschanged = _carregar;
}
function _escolherVoz() {
  if (!_vozes.length) _carregar();
  const pt = _vozes.filter((v) => /pt[-_]?br|portugu/i.test(`${v.lang} ${v.name}`));
  const fem = pt.find((v) => /(luciana|maria|fernanda|francisca|joana|helo|female|google portugu)/i.test(v.name));
  return fem || pt[0] || null;
}
function _falarWebSpeech(texto, { onInicio, onFim } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) { onFim && onFim(); return; }
  const ss = window.speechSynthesis;
  ss.cancel();
  const voz = _escolherVoz();
  const frases = String(texto).replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g) || [String(texto)];
  onInicio && onInicio();
  let terminou = false;
  const fim = () => { if (!terminou) { terminou = true; onFim && onFim(); } };
  frases.forEach((f, i) => {
    const u = new SpeechSynthesisUtterance(f.trim());
    u.lang = "pt-BR";
    if (voz) u.voice = voz;
    u.rate = 1; u.pitch = 1.02;
    if (i === frases.length - 1) { u.onend = fim; u.onerror = fim; }
    ss.speak(u);
  });
}

// ── API pública ─────────────────────────────────────────────────────────────
export function vozDisponivel() {
  // sempre há voz (nativa); premium é upgrade transparente quando há chave
  return typeof window !== "undefined" && ("speechSynthesis" in window);
}

export function pararFala() {
  try { if (_audio) { _audio.pause(); _audio.currentTime = 0; _audio = null; } } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
}

export function falar(texto, opts = {}) {
  if (!texto) return;
  pararFala();
  _checarPremium().then((premium) => {
    if (premium) _falarPremium(texto, opts).catch(() => _falarWebSpeech(texto, opts));
    else _falarWebSpeech(texto, opts);
  });
}
