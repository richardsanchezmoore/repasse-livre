"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal (V6): CARD 1 (promessa) → CHAT (Helena/Lady)
//  → O MAPA (5 passos visuais) → OFERTA MATERIALIZADA.
//
//  Estratégia: o CHAT é uma PONTE (identificação → acolhimento → autoridade da
//  Helena → curiosidade). Não ensina, não dá exemplo específico, não aprofunda
//  Elegância Prática, não revela PERLA. A VENDA acontece quando o MAPA (5 passos)
//  e o entregável ficam tangíveis. "O chat faz querer saber; o mapa faz querer ter."
//  Autoridade da Helena pela trajetória (observou→estudou→padrões→organizou).
//  Instrumentação: ViewContent · FunilPasso + /api/evento · InitiateCheckout.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import PreCheckout from "@/components/PreCheckout";

const LADY_FOTO = "/livro/lady.webp";

function horaAgora() {
  try { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
  catch { return ""; }
}

// Áudio da Lady (ElevenLabs). Deixe "" para usar o texto; ao subir o arquivo em
// public/livro/, aponte aqui (ex.: "/livro/lady-voz.mp3") e a bolha vira voz.
// Nota de voz da Lady — roteiro NATURAL (fala de gente, não frase de efeito).
// Fallback em texto continua sendo a tese crua. "" desliga a voz.
const LADY_AUDIO = "/livro/lady-voz-2.mp3";
const BAR_HEIGHTS = [7, 12, 18, 10, 20, 14, 23, 9, 16, 12, 21, 8, 15, 19, 11, 22, 10, 17, 13, 9, 18, 12, 20, 11];

function fmtDur(s) {
  if (!s || !isFinite(s)) return "";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Player de nota de voz estilo WhatsApp: play/pause + ondinha + duração (conta ao
// tocar) + FOTO da Lady com selo de microfone. Cores da marca, layout do WhatsApp.
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
      <button type="button" className="ldy-audio-btn" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"}>
        {playing ? (
          <svg viewBox="0 0 16 16" width="14" height="14"><rect x="4" y="3" width="3" height="10" fill="currentColor" /><rect x="9" y="3" width="3" height="10" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 3l9 5-9 5z" fill="currentColor" /></svg>
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
const VALOR = 67.9;
const CONTEUDO = "Kit · A Mulher que Ele Procura";

// Os 5 passos do MAPA (nomes visíveis; o PERLA como mecanismo fica na obra).
const PASSOS = [
  { n: "01", nome: "Presença", desc: "Como ser notada por quem você quer.", img: "/livro/thumb/cena4.webp" },
  { n: "02", nome: "Expressão", desc: "O que você comunica antes de falar.", img: "/livro/thumb/cena2.webp" },
  { n: "03", nome: "Revelação", desc: "Como despertar a curiosidade dele.", img: "/livro/thumb/cena11.webp" },
  { n: "04", nome: "Linguagem", desc: "O que dizer para criar conexão.", img: "/livro/thumb/cena5.webp" },
  { n: "05", nome: "Ação", desc: "Como agir quando o interesse é dos dois.", img: "/livro/thumb/cena10.webp" },
];

// ── roteiro do chat (V6 — Helena; ponte, não aula) ──────────────────────────
const Q2 = "E como estão as coisas hoje?";
const Q2_OPTS = [
  { t: "Aparece, mas não vai para frente", to: "r2_frente" },
  { t: "Eu acabo me machucando", to: "r2_machuco" },
];

// Abertura A/B (testável): ?ab=a|b força a variante; senão 50/50 persistido.
// Testa só o gancho das 2 primeiras bolhas — a pergunta Q1 é a mesma nas duas.
const ABERTURA = {
  a: [
    "Oi, querida. ❤️ Eu sou a Helena — mas aqui pode me chamar de Lady.",
    "Quero te conhecer um pouco antes de te mostrar uma coisa.",
    "Quando você pensa no relacionamento que gostaria de viver, o que mais deseja?",
  ],
  b: [
    "Oi, querida. ❤️ Que bom que você chegou até aqui.",
    "Me conta: o que você mais deseja num relacionamento?",
  ],
};

const CHAT = {
  start: {
    lady: ABERTURA.b,
    opts: [
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
    ],
  },

  rec_serio: { lady: ["Entendi. Você quer alguém que esteja buscando o mesmo que você.", Q2], opts: Q2_OPTS },
  rec_valor: { lady: ["Ah, isso mexe comigo. Ser amada e sentir que te valorizam sempre — não só no começo.", Q2], opts: Q2_OPTS },
  rec_dividir: { lady: ["Eu entendo o que você busca. Ter alguém para compartilhar a vida muda muita coisa.", Q2], opts: Q2_OPTS },

  // Acolhimento suave (muda só a 1ª linha) → converge direto p/ a observação e o
  // beat de identificação. Sem alavanca "Me conta" (a mulher já contou a dor).
  r2_ninguem: {
    lady: [
      "Eu imagino como isso pesa. Você quer viver algo, mas parece que nada começa.",
      "Já vi tantas mulheres passarem por isso. Diferentes umas das outras, mas travando quase sempre nas mesmas coisas.",
    ],
    opts: [
      { t: "Sou eu também.", to: "descoberta" },
      { t: "Parece bastante comigo.", to: "descoberta" },
    ],
  },
  r2_frente: {
    lady: [
      "Isso é frustrante. Começa bem e, de repente, tudo para.",
      "Já vi tantas mulheres passarem por isso. Diferentes umas das outras, mas travando quase sempre nas mesmas coisas.",
    ],
    opts: [
      { t: "Sou eu também.", to: "descoberta" },
      { t: "Parece bastante comigo.", to: "descoberta" },
    ],
  },
  r2_machuco: {
    lady: [
      "Essa parte dói. Você entra querendo que dê certo e sai machucada.",
      "Já vi tantas mulheres passarem por isso. Diferentes umas das outras, mas travando quase sempre nas mesmas coisas.",
    ],
    opts: [
      { t: "Sou eu também.", to: "descoberta" },
      { t: "Parece bastante comigo.", to: "descoberta" },
    ],
  },

  // Acolhe a identificação → descoberta firme → territórios, num fôlego só
  // (sem a alavanca "Como assim?"). SOBRE O MÉTODO = convicção.
  descoberta: {
    lady: [
      "E você não está sozinha nisso. Foi o que me levou a estudar comportamento, comunicação e relacionamentos.",
      "E uma coisa ficou clara:",
      // Slot de voz dormente (LADY_AUDIO=""): hoje renderiza como TEXTO — a tese-joia.
      { audio: LADY_AUDIO, dur: "0:15", texto: "O que desperta um relacionamento começa antes do primeiro contato." },
    ],
    opts: [{ t: "E como eu faço isso?", to: "encerramento" }],
  },
  // Responde DIRETO à pergunta "E como eu faço isso?" (ponte pergunta→produto)
  encerramento: {
    lady: [
      "É exatamente isso que você vai encontrar no mapa.",
      "São 5 passos que mostram exatamente o que fazer em cada etapa.",
    ],
    opts: [{ t: "Quero ver o mapa →", cta: true, to: "__done" }],
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
          <div className={"ldy-status" + (typing ? " digitando" : "")}>{typing ? "Digitando…" : "Online"}</div>
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

export default function FunilSwipe({ preco = "R$ 67,90", precoDe = "", url = "", slug = "" }) {
  const [step, setStep] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const avancar = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  // Variante da abertura A/B: ?ab=a|b força (útil p/ testar por anúncio no Meta);
  // senão sorteia 50/50 e persiste (organico).
  const [variante] = useState(() => {
    if (typeof window === "undefined") return "b";
    try {
      // B é o padrão (a Lady já se apresenta no card 1); ?ab=a força a antiga p/ teste.
      return new URLSearchParams(window.location.search).get("ab") === "a" ? "a" : "b";
    } catch { return "b"; }
  });

  useEffect(() => {
    document.body.classList.add("sw-fs");
    return () => document.body.classList.remove("sw-fs");
  }, []);

  useEffect(() => { trackFb("ViewContent", { content_name: CONTEUDO, content_category: "funil", value: VALOR, currency: "BRL", ab: variante }); }, [variante]);
  useEffect(() => {
    trackFb("FunilPasso", { passo: step + 1, ab: variante }, "trackCustom");
    let vid = null;
    try { vid = localStorage.getItem("dv_vid"); if (!vid) { vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); localStorage.setItem("dv_vid", vid); } } catch {}
    try { fetch("/api/evento", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo: "mulher_passo", passo: step + 1, vid, ab: variante }) }); } catch {}
  }, [step]);

  function abrirCheckout() {
    trackFb("InitiateCheckout", { content_name: CONTEUDO, value: VALOR, currency: "BRL" });
    setShowCheck(true);
  }

  return (
    <div className="sw">
      <div className="sw-prog">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>

      {/* CARD 1 — a promessa (tangível, cabe na viewport) */}
      {step === 0 && (
        <>
          <div className="sw-card hero" key="c0">
            <h1 className="sw-h">O Mapa das Mulheres</h1>
            <p className="sw-sub">Para destravar as relações — e viver o que você tanto deseja.</p>
            <p className="sw-p">Você quer alguém para amar, cuidar e dividir a vida. E, mesmo fazendo a sua parte, isso ainda não aconteceu.</p>
            <p className="sw-destaque">E você não é a única.</p>
            <p className="sw-p">Foi olhando de perto para muitas mulheres que percebi: mesmo sendo diferentes, quase todas enfrentam as mesmas dificuldades.</p>
          </div>
          <div className="sw-foot">
            <div className="sw-assina">
              {LADY_FOTO ? <img src={LADY_FOTO} alt="Lady Helena" /> : <span className="sw-assina-av">H</span>}
              <div className="sw-assina-txt">
                <div className="sw-assina-n">Lady Helena</div>
                <div className="sw-assina-r">Quem vai te guiar</div>
              </div>
            </div>
            <button className="sw-btn" onClick={avancar}>Quero entender</button>
            <span className="sw-hint">leva cerca de 2 minutinhos</span>
          </div>
        </>
      )}

      {/* CARD 2 — INIMIGO COMUM (não é você; os caminhos que já falharam) */}
      {step === 1 && (
        <>
          <div className="sw-card rola" key="c1">
            <div className="sw-eyebrow">A verdade</div>
            <div className="sw-muda-h">O problema nunca foi você</div>
            <p className="sw-p" style={{ margin: "0 auto 6px" }}>Se você tentou e não deu certo, não foi por falta de esforço. Já te disseram de tudo:</p>
            <ul className="sw-erros">
              <li>Ter paciência e esperar o tempo certo.</li>
              <li>Se amar primeiro que alguém aparece.</li>
              <li>Se fazer de difícil pra ele correr atrás.</li>
            </ul>
            <p className="sw-destaque" style={{ fontSize: "clamp(19px,5.4vw,24px)" }}>E, mesmo assim, nada mudou.</p>
            <p className="sw-p">Porque todos esses caminhos esquecem a mesma coisa. E é justamente ela que muda o jogo.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero saber o que é →</button></div>
        </>
      )}

      {/* CHAT COM A HELENA */}
      {step === 2 && <LadyChat variante={variante} onDone={() => setStep(3)} />}

      {/* O MAPA — 5 passos + "não são cinco dicas" */}
      {step === 3 && (
        <>
          <div className="sw-card rola" key="c2">
            <div className="sw-eyebrow">O mapa</div>
            <div className="sw-mapa-titulo">O Mapa das Mulheres</div>
            <div className="sw-mapa-sub">5 passos para destravar seus relacionamentos.</div>
            <div className="sw-passos">
              {PASSOS.map((p) => (
                <div key={p.n} className="sw-passo">
                  <img className="sw-passo-img" src={p.img} alt="" loading="lazy" />
                  <span className="sw-passo-n">{p.n}</span>
                  <div>
                    <div className="sw-passo-nome">{p.nome}</div>
                    <div className="sw-passo-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sw-seq">
              <div className="sw-seq-t">Não são cinco dicas soltas.</div>
              <p>Existe uma sequência. Primeiro você entende onde está. Depois, o que mostra. Depois, o que revela. Depois, como se conecta. E, por fim, como age e escolhe.</p>
            </div>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero ver o que muda →</button></div>
        </>
      )}

      {/* O QUE MUDA PARA VOCÊ — benefício/transformação (progressão) + antes→depois */}
      {step === 4 && (
        <>
          <div className="sw-card" key="c4">
            <div className="sw-eyebrow">A transformação</div>
            <div className="sw-muda-h">O que muda para você</div>
            <p className="sw-p" style={{ margin: "2px auto 4px" }}>Da dúvida… para o desejo.</p>

            <div className="sw-transform">
              <div className="sw-tr antes">
                <div className="sw-tr-l">Hoje</div>
                <div className="sw-tr-t">Ver o interesse dele esfriar — e não saber por quê.</div>
              </div>
              <div className="sw-tr depois">
                <div className="sw-tr-l">Depois</div>
                <div className="sw-tr-t">Ser a mulher que ele admira, procura e não quer perder.</div>
              </div>
            </div>

            <p className="sw-destaque" style={{ fontSize: "clamp(18px,5vw,23px)", marginTop: "20px" }}>Você deixa de esperar ser escolhida — e passa a ser desejada de verdade.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Ver a oferta →</button></div>
        </>
      )}

      {/* OFERTA — vende o caminho; formato/garantia perto do checkout (não como título) */}
      {step === 5 && (
        <>
          <div className="sw-card rola" key="c4">
            <div className="sw-oferta-card">
              <div className="ic">🔑</div>
              <div className="sw-oferta-t">O Mapa + a Coleção da Corte</div>
              <div className="sw-oferta-d">Tudo para você entender, aplicar e escolher com clareza:</div>

              <div className="sw-kit">
                <ul>
                  <li><b>O Mapa</b> — a obra completa, os 5 passos por dentro</li>
                  <li><b>O Panfleto Secreto</b> — os 12 perfis a reconhecer antes do altar</li>
                  <li><b>O Dossiê + o Veredito</b> — investigue o pretendente e leia os sinais</li>
                  <li><b>O Cavalheiro que Vale o seu Altar</b> — o contramodelo (Boaz)</li>
                  <li><b>Cartas Entre Nós</b> — 24 perguntas que revelam o caráter dele</li>
                  <li><b>Guia “Verde ou Vermelho?”</b> — os sinais lado a lado</li>
                  <li><b>Wallpapers “Mulher de Valor”</b> — versículos de identidade</li>
                  <li><b>O Diário da Dama</b> — 7 noites de reflexão e oração</li>
                </ul>
              </div>

              <div className="sw-preco">{precoDe ? <span className="sw-preco-de">tudo isso: de {precoDe}</span> : null}{preco}<small>pagamento único · acesso imediato e vitalício</small></div>
              <div className="sw-pix">no <b>PIX</b> ou em até <b>6x de R$ 13,00</b> no cartão</div>
              <p className="sw-reassure">✓ Acesso na hora · ✓ 7 dias de garantia</p>
              {url ? (
                <button type="button" className="pill" onClick={abrirCheckout}>Quero tudo →</button>
              ) : (
                <span className="pill" style={{ opacity: 0.6, display: "inline-block" }}>Em breve</span>
              )}
            </div>
          </div>
        </>
      )}

      {showCheck && url && <PreCheckout url={url} slug={slug} onClose={() => setShowCheck(false)} />}
    </div>
  );
}
