"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe (ES / México) — porta em espanhol do funil principal.
//  Mesma estratégia do BR: CARD 1 (promessa) → CHAT (Helena/Lady) → EL MAPA →
//  OFERTA. Diferenças de mercado: checkout via WIDGET Hotmart (popup), moeda MXN,
//  pixel MX (PixelMX injeta o fbq da conta mexicana). CSS é o MESMO (.sw-/.ldy-).
//  Tom: español mexicano, cálido, católico-friendly, trato "tú".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import HotmartCheckout from "@/components/HotmartCheckout"; // ✅ widget popup (no sale del sitio)
import PixelMX from "@/components/PixelMX"; // pixel Meta da conta MX (separado do BR)

const LADY_FOTO = "/livro/lady.webp";

function horaAgora() {
  try { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
  catch { return ""; }
}

// Sin audio en español todavía → "" usa el texto (la tesis igual aparece escrita).
// Cuando grabemos la voz de la Lady en español, apunta aquí (ej.: "/livro/lady-voz-es.mp3").
const LADY_AUDIO = "";
const BAR_HEIGHTS = [6, 11, 8, 15, 10, 18, 12, 7, 14, 20, 9, 16, 11, 22, 8, 13, 17, 10, 19, 12, 7, 15, 21, 9, 14, 11, 18, 8, 16, 13, 20, 10, 12, 17, 7, 14, 19, 9, 15, 11, 18, 8, 13, 16, 10, 20, 12, 9];

function fmtDur(s) {
  if (!s || !isFinite(s)) return "";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Nota de voz estilo WhatsApp (idéntico al BR).
function LadyAudio({ src, durProp = "" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(durProp);
  const [elapsed, setElapsed] = useState("");
  function toggle() {
    const a = ref.current; if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }
  return (
    <div className="ldy-audio">
      <audio ref={ref} src={src} preload="metadata"
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (d) setDur(fmtDur(d)); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProg(0); setElapsed(""); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration) { setProg(a.currentTime / a.duration); setElapsed(fmtDur(a.currentTime)); } }} />
      <button type="button" className="ldy-audio-btn" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"}>
        {playing ? (
          <svg viewBox="0 0 16 16" width="17" height="17"><rect x="4" y="3" width="3" height="10" fill="currentColor" /><rect x="9" y="3" width="3" height="10" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" width="17" height="17"><path d="M4 3l9 5-9 5z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="ldy-audio-mid">
        <div className="ldy-audio-wave">
          {BAR_HEIGHTS.map((h, i) => (
            <span key={i} className={"ldy-bar" + (prog * BAR_HEIGHTS.length > i ? " on" : "")} style={{ height: h + "px" }} />
          ))}
        </div>
        <span className="ldy-audio-dur">{playing && elapsed ? elapsed : (dur || durProp)}</span>
      </div>
      <div className="ldy-audio-av">
        {LADY_FOTO ? <img src={LADY_FOTO} alt="Helena" /> : <span className="ldy-audio-avf">H</span>}
        <span className="ldy-audio-mic" aria-hidden>
          <svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" /></svg>
        </span>
      </div>
    </div>
  );
}

function trackFb(evento, dados, tipo = "track") {
  try { if (typeof window !== "undefined" && window.fbq) window.fbq(tipo, evento, dados); } catch {}
}
const VALOR = 299;
const MONEDA = "MXN";
const CONTEUDO = "Kit · La Mujer que Él Busca";

// El Mapa se vende como DESCUBRIMIENTO — no "curso de 5 pasos". La estructura interna
// (P.E.R.L.A) queda en la obra; aquí, capas evocativas: muestran profundidad sin checklist.
const CAMADAS = [
  "Lo que tu presencia comunica antes de que hables.",
  "Cómo despertar su curiosidad.",
  "Lo que hace crecer el interés — o lo enfría.",
  "Qué decir para crear una conexión de verdad.",
  "Cómo reconocer el momento — y al hombre — correcto.",
];

// ── guion del chat (Helena; puente, no clase) ───────────────────────────────
const Q2 = "¿Y cómo están las cosas hoy?";
const Q2_OPTS = [
  { t: "Aparece, pero no avanza", to: "r2_frente" },
  { t: "Termino saliendo lastimada", to: "r2_machuco" },
];

const ABERTURA = {
  a: [
    "Hola, querida. ❤️ Soy Helena — pero aquí puedes decirme Lady.",
    "Quiero conocerte un poco antes de mostrarte algo.",
    "Cuando piensas en la relación que te gustaría vivir, ¿qué es lo que más deseas?",
  ],
  b: [
    "Hola, querida. ❤️ Qué bueno que llegaste hasta aquí.",
    "Cuéntame: ¿qué es lo que más deseas en una relación?",
  ],
};

const CHAT = {
  start: {
    lady: ABERTURA.b,
    opts: [
      { t: "Ser amada y valorada", to: "rec_valor" },
      { t: "Encontrar a alguien que quiera algo serio", to: "rec_serio" },
    ],
  },

  rec_serio: { lady: ["Entiendo. Quieres a alguien que busque lo mismo que tú.", Q2], opts: Q2_OPTS },
  rec_valor: { lady: ["Ay, eso me toca. Ser amada y sentir que te valoran por quien eres.", Q2], opts: Q2_OPTS },
  rec_dividir: { lady: ["Entiendo lo que buscas. Tener a alguien con quien compartir la vida cambia mucho.", Q2], opts: Q2_OPTS },

  r2_ninguem: {
    lady: [
      "Me imagino cuánto pesa. Quieres vivir algo, pero parece que nada empieza.",
      "He visto a muchas mujeres pasar por esto. Todas son diferentes entre sí, pero casi siempre tropiezan con las mismas cosas.",
    ],
    opts: [
      { t: "Soy yo también.", to: "descoberta" },
      { t: "Se parece bastante a mí.", to: "descoberta" },
    ],
  },
  r2_frente: {
    lady: [
      "Eso es frustrante. Empieza bien y, de repente, todo se detiene.",
      "He visto a muchas mujeres pasar por esto. Todas son diferentes entre sí, pero casi siempre tropiezan con las mismas cosas.",
    ],
    opts: [
      { t: "Soy yo también.", to: "descoberta" },
      { t: "Se parece bastante a mí.", to: "descoberta" },
    ],
  },
  r2_machuco: {
    lady: [
      "Esa parte duele. Entras queriendo que funcione y sales lastimada.",
      "He visto a muchas mujeres pasar por esto. Todas son diferentes entre sí, pero casi siempre tropiezan con las mismas cosas.",
    ],
    opts: [
      { t: "Soy yo también.", to: "descoberta" },
      { t: "Se parece bastante a mí.", to: "descoberta" },
    ],
  },

  descoberta: {
    lady: [
      "Y no estás sola en esto. Fue lo que me llevó a estudiar el comportamiento, la comunicación y las relaciones.",
      "Y una cosa quedó clara:",
      { audio: LADY_AUDIO, dur: "0:15", texto: "Lo que despierta una relación empieza antes del primer contacto." },
      ...(LADY_AUDIO ? ["O sea: lo que despierta una relación empieza antes del primer contacto."] : []),
    ],
    opts: [{ t: "¿Y cómo hago eso?", to: "encerramento" }],
  },
  encerramento: {
    lady: [
      "Es exactamente eso lo que revela el Mapa.",
      "Existe una forma nueva de posicionarte — que va a despertar interés y hacer que una relación suceda.",
    ],
    opts: [{ t: "Quiero ver el mapa →", cta: true, to: "__done" }],
  },
};

function LadyChat({ onDone, variante = "a" }) {
  const [node, setNode] = useState("start");
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showOpts, setShowOpts] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    const n = node === "start" ? { ...CHAT.start, lady: ABERTURA[variante] || ABERTURA.a } : CHAT[node];
    if (!n) return;
    let cancelled = false;
    let idx = 0;
    const timers = [];
    setShowOpts(false);
    const step = () => {
      if (cancelled) return;
      if (idx >= n.lady.length) { setShowOpts(true); return; }
      const item = n.lady[idx];
      const isAudio = typeof item === "object" && !!item.audio;
      const text = typeof item === "string" ? item : (item.texto || "");
      setTyping(true);
      const dly = isAudio ? 1100 : 700 + Math.min(text.length * 14, 1700);
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setMsgs((m) => [...m, isAudio
          ? { who: "lady", audio: item.audio, dur: item.dur, hora: horaAgora() }
          : { who: "lady", text, hora: horaAgora() }]);
        idx += 1;
        timers.push(setTimeout(step, 280));
      }, dly));
    };
    step();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [node, variante]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [msgs, typing, showOpts]);

  function pick(o) {
    setMsgs((m) => [...m, { who: "eu", text: o.t, hora: horaAgora() }]);
    setShowOpts(false);
    if (o.to === "__done") { setTimeout(() => onDone(), 500); return; }
    setTimeout(() => setNode(o.to), 350);
  }

  const opts = CHAT[node]?.opts || [];
  return (
    <div className="ldy">
      <div className="ldy-top">
        <div className="ldy-avwrap">
          <div className="ldy-av">{LADY_FOTO ? <img src={LADY_FOTO} alt="Helena" /> : "H"}</div>
          <span className="ldy-online" aria-hidden></span>
        </div>
        <div className="ldy-id">
          <div className="ldy-nome">Helena</div>
          <div className={"ldy-status" + (typing ? " digitando" : "")}>{typing ? "Escribiendo…" : "En línea"}</div>
        </div>
      </div>
      <div className="ldy-thread" ref={threadRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"ldy-msg " + (m.who === "lady" ? "lady" : "eu") + (m.audio ? " audio" : "")}>
            {m.audio ? <LadyAudio src={m.audio} durProp={m.dur} /> : m.text}
            {m.hora && <span className="ldy-hora">{m.hora}</span>}
          </div>
        ))}
        {typing && (
          <div className="ldy-typing"><span></span><span></span><span></span></div>
        )}
      </div>
      {showOpts && (
        <div className="ldy-opts">
          {opts.map((o, i) => (
            <button key={i} type="button" className={"ldy-opt" + (o.cta ? " cta" : "")} onClick={() => pick(o)}>
              {o.t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TOTAL = 6;

export default function FunilSwipe({ preco = "MXN $299", precoDe = "" }) {
  const [step, setStep] = useState(0);
  const avancar = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const [variante] = useState(() => {
    if (typeof window === "undefined") return "b";
    try {
      return new URLSearchParams(window.location.search).get("ab") === "a" ? "a" : "b";
    } catch { return "b"; }
  });

  useEffect(() => {
    document.body.classList.add("sw-fs");
    return () => document.body.classList.remove("sw-fs");
  }, []);

  useEffect(() => { trackFb("ViewContent", { content_name: CONTEUDO, content_category: "funil", value: VALOR, currency: MONEDA, ab: variante }); }, [variante]);
  useEffect(() => {
    trackFb("FunilPasso", { passo: step + 1, ab: variante }, "trackCustom");
    let vid = null;
    try { vid = localStorage.getItem("dv_vid"); if (!vid) { vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); localStorage.setItem("dv_vid", vid); } } catch {}
    try { fetch("/api/evento", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo: "mujer_paso", passo: step + 1, vid, ab: variante, mercado: "mx" }) }); } catch {}
  }, [step]);

  return (
    <div className="sw">
      <PixelMX value={VALOR} currency={MONEDA} />
      <div className="sw-prog">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>

      {/* CARD 1 — la promesa */}
      {step === 0 && (
        <>
          <div className="sw-card hero" key="c0">
            <h1 className="sw-h">El Mapa de las Mujeres</h1>
            <p className="sw-sub">Sé amada y deseada.</p>
            <p className="sw-p">Quieres a alguien para amar, cuidar y compartir la vida. Y, aun haciendo tu parte, todavía no ha pasado.</p>
            <p className="sw-destaque">Y no eres la única.</p>
            <p className="sw-p">Fue observando a muchas mujeres que me di cuenta: casi todas enfrentan las mismas dificultades.</p>
          </div>
          <div className="sw-foot">
            <div className="sw-assina">
              {LADY_FOTO ? <img src={LADY_FOTO} alt="Lady Helena" /> : <span className="sw-assina-av">H</span>}
              <div className="sw-assina-txt">
                <div className="sw-assina-n">Lady Helena</div>
                <div className="sw-assina-r">Quien te va a guiar</div>
              </div>
            </div>
            <button className="sw-btn" onClick={avancar}>Quiero entender</button>
            <span className="sw-hint">toma unos 2 minutitos</span>
          </div>
        </>
      )}

      {/* CARD 2 — ENEMIGO COMÚN */}
      {step === 1 && (
        <>
          <div className="sw-card rola" key="c1">
            <div className="sw-eyebrow">La verdad</div>
            <div className="sw-muda-h">El problema nunca fuiste tú</div>
            <p className="sw-p" style={{ margin: "0 auto 6px" }}>Ya te dijeron de todo:</p>
            <ul className="sw-erros">
              <li>Tener paciencia y esperar el momento.</li>
              <li>Amarte primero antes de que alguien llegue.</li>
              <li>Hacerte la difícil para que él te persiga.</li>
            </ul>
            <p className="sw-destaque" style={{ fontSize: "clamp(19px,5.4vw,24px)", fontStyle: "normal" }}>Y aun así, nada cambió.</p>
            <p className="sw-p" style={{ fontWeight: 700, color: "#f3e6cd" }}>Porque todos te mostraron una puerta — pero nunca te dieron <b style={{ color: "var(--gold-2)" }}>la llave</b>.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quiero descubrir →</button></div>
        </>
      )}

      {/* CHAT CON HELENA */}
      {step === 2 && <LadyChat variante={variante} onDone={() => setStep(3)} />}

      {/* EL MAPA — descubrimiento (no "5 pasos") */}
      {step === 3 && (
        <>
          <div className="sw-card rola" key="c2">
            <div className="sw-eyebrow">El mapa</div>
            <div className="sw-mapa-titulo">
              {variante === "a" ? "Lo que ellas ven — y tú aún no." : "Volviéndote deseable"}
            </div>
            <div className="sw-mm-intro">Al recorrer el Mapa, vas a ir descubriendo:</div>
            <div className="sw-mm">
              <div className="sw-mm-raiz">Tú</div>
              <div className="sw-mm-ramos">
                {CAMADAS.map((c, i) => (
                  <div key={i} className="sw-mm-ramo">
                    <span className="sw-mm-n" style={{ fontSize: 17 }}>✦</span>
                    <div className="sw-mm-no sw-mm-txt">{c}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quiero ver el Mapa →</button></div>
        </>
      )}

      {/* LO QUE CAMBIA PARA TI */}
      {step === 4 && (
        <>
          <div className="sw-card hero" key="c4">
            <div className="sw-eyebrow">La transformación</div>
            <div className="sw-muda-h">Lo que cambia para ti</div>
            <p className="sw-p" style={{ margin: "2px auto 16px" }}>Imagina a la mujer en la que te vas a convertir:</p>

            <div className="sw-torna">Esa que él admira, busca — y no quiere perder.</div>

            <p className="sw-destaque" style={{ fontSize: "clamp(18px,5.2vw,24px)", marginTop: "24px" }}>Dejas de esperar a ser elegida — y pasas a ser deseada de verdad.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quiero la Transformación →</button></div>
        </>
      )}

      {/* OFERTA */}
      {step === 5 && (
        <>
          <div className="sw-card rola" key="c5">
            <div className="sw-oferta-card">
              <div className="sw-oferta-t">El Mapa<br />+ Colección Completa</div>

              <div className="sw-kit">
                <ul>
                  <li><span className="sw-kit-ic">📖</span><span><b>Cómo Convertirte en la Mujer que “Él” Busca</b></span></li>
                  <li><span className="sw-kit-ic">✨</span><span><b>+ Mucho más</b> — las Cartas Entre Nosotras, el Panfleto Secreto, el Caballero (Booz), la Guía “¿Verde o Rojo?”, los Wallpapers y el Diario de la Dama</span></li>
                </ul>
              </div>

              <div className="sw-preco">
                {precoDe ? <span className="sw-preco-de">Antes {precoDe}, hoy solo</span> : null}
                <span className="sw-preco-parcela">{preco}</span>
                <small>pago único · acceso inmediato · a meses sin intereses</small>
              </div>
              <div className="sw-urg">🌷 <b>Oferta de lanzamiento</b> — por tiempo limitado.</div>
              <p className="sw-reassure">✓ Acceso inmediato · ✓ de por vida · ✓ 7 días de garantía</p>

              <div className="sw-provas">
                <div className="sw-prova">
                  <div className="sw-estrelas">★★★★★</div>
                  <p className="sw-prova-q">“Estaba acostumbrada a perseguir. <b>Hoy es diferente:</b> noto a más hombres tomando la iniciativa e interesándose por mí.”</p>
                  <div className="sw-prova-n">— Mariana, 32 años</div>
                </div>
                <div className="sw-prova">
                  <div className="sw-estrelas">★★★★★</div>
                  <p className="sw-prova-q">“Después de aplicar lo que vi en el mapa, noté <b>perfiles de hombres que antes ni me notaban</b> empezando a mostrar interés.”</p>
                  <div className="sw-prova-n">— Camila, 29 años</div>
                </div>
                <div className="sw-prova">
                  <div className="sw-estrelas">★★★★★</div>
                  <p className="sw-prova-q">“Lo que más me sorprendió fue <b>despertar interés sin forzar nada.</b> Los hombres empezaron a acercarse de otra forma.”</p>
                  <div className="sw-prova-n">— Fernanda, 35 años</div>
                </div>
                <div className="sw-prova">
                  <div className="sw-estrelas">★★★★★</div>
                  <p className="sw-prova-q">“Creía que necesitaba encontrar a alguien. Después del mapa, entendí <b>cómo posicionarme</b> — y los hombres empezaron a percibirme distinto.”</p>
                  <div className="sw-prova-n">— Renata, 38 años</div>
                </div>
              </div>

              <div className="sw-assina sw-assina-oferta">
                {LADY_FOTO ? <img src={LADY_FOTO} alt="Lady Helena" /> : <span className="sw-assina-av">H</span>}
                <div className="sw-assina-txt">
                  <div className="sw-assina-n">Lady Helena</div>
                  <div className="sw-assina-r">Quien preparó todo esto para ti</div>
                </div>
              </div>
            </div>
          </div>
          {/* CTA FIJO — abre el popup del Hotmart (no sale del sitio). Si no hay oferta
              configurada (env), el componente muestra "Próximamente" deshabilitado. */}
          <div className="sw-foot">
            <HotmartCheckout
              className="sw-btn ouro sw-glow"
              valor={VALOR}
              currency={MONEDA}
              metadata={{ origem: "funil-mujer-es", ab: variante }}
              onClick={() => trackFb("InitiateCheckout", { content_name: CONTEUDO, value: VALOR, currency: MONEDA })}
            >
              Quiero todo →
            </HotmartCheckout>
          </div>
        </>
      )}
    </div>
  );
}
