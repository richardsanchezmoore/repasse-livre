"use client";

/**
 * A VOZ da Marta — camada única e trocável.
 *
 * Hoje: Web Speech API (SpeechSynthesis) nativa do aparelho — GRÁTIS, latência
 * zero, offline. Amanhã, pra uma voz materna premium (ElevenLabs / Azure Neural
 * pt-BR / OpenAI), basta reescrever o corpo de `falar()` pra buscar o áudio e dar
 * play — a UI chama sempre `falar(texto)` e `pararFala()`, sem saber o motor.
 */

let _vozes = [];
function _carregar() {
  try { _vozes = window.speechSynthesis?.getVoices?.() || []; } catch { _vozes = []; }
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  _carregar();
  // No iOS/alguns Androids as vozes carregam async.
  window.speechSynthesis.onvoiceschanged = _carregar;
}

/** Melhor voz pt-BR disponível (preferindo timbre feminino, quando dá pra saber). */
function _escolherVoz() {
  if (!_vozes.length) _carregar();
  const pt = _vozes.filter((v) => /pt[-_]?br|portugu/i.test(`${v.lang} ${v.name}`));
  const fem = pt.find((v) => /(luciana|maria|fernanda|francisca|joana|helo|female|google portugu)/i.test(v.name));
  return fem || pt[0] || null;
}

export function vozDisponivel() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function pararFala() {
  try { window.speechSynthesis.cancel(); } catch { /* nada */ }
}

/**
 * Fala o texto em pt-BR. Quebra em frases e enfileira — evita o corte de ~15s
 * que alguns navegadores fazem em texto longo. onInicio/onFim atualizam a UI.
 */
export function falar(texto, { onInicio, onFim } = {}) {
  if (!vozDisponivel() || !texto) return;
  const ss = window.speechSynthesis;
  ss.cancel(); // reseta qualquer fala anterior
  const voz = _escolherVoz();
  const frases = String(texto).replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g) || [String(texto)];
  onInicio && onInicio();
  let terminou = false;
  const fim = () => { if (!terminou) { terminou = true; onFim && onFim(); } };
  frases.forEach((f, i) => {
    const u = new SpeechSynthesisUtterance(f.trim());
    u.lang = "pt-BR";
    if (voz) u.voice = voz;
    u.rate = 1; u.pitch = 1.02; // um tiquinho mais acolhedor
    if (i === frases.length - 1) { u.onend = fim; u.onerror = fim; }
    ss.speak(u);
  });
}
