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

function trackFb(evento, dados, tipo = "track") {
  try { if (typeof window !== "undefined" && window.fbq) window.fbq(tipo, evento, dados); } catch {}
}
const VALOR = 37.9;
const CONTEUDO = "Kit · A Mulher que Ele Procura";

// Os 5 passos do MAPA (nomes visíveis; o PERLA como mecanismo fica na obra).
const PASSOS = [
  { n: "01", nome: "Presença", desc: "Onde você está e como criar movimento.", img: "/livro/cena4.webp" },
  { n: "02", nome: "Expressão", desc: "O que a sua presença comunica.", img: "/livro/cena2.webp" },
  { n: "03", nome: "Revelação", desc: "Como despertar curiosidade sem se entregar por inteiro.", img: "/livro/cena11.webp" },
  { n: "04", nome: "Linguagem", desc: "Como transformar aproximação em conexão.", img: "/livro/cena5.webp" },
  { n: "05", nome: "Ação", desc: "Como observar, escolher e conduzir.", img: "/livro/cena10.webp" },
];

// ── roteiro do chat (V6 — Helena; ponte, não aula) ──────────────────────────
const Q2 = "E como estão as coisas hoje?";
const Q2_OPTS = [
  { t: "Não aparece ninguém", to: "r2_ninguem" },
  { t: "Aparece, mas não vai para frente", to: "r2_frente" },
  { t: "Eu acabo me machucando", to: "r2_machuco" },
];
const CONTINUA = [{ t: "Me conta", to: "experiencia" }];

const CHAT = {
  start: {
    lady: [
      "Oi, querida. ❤️ Eu sou a Helena — mas aqui pode me chamar de Lady.",
      "Quero te conhecer um pouco antes de te mostrar uma coisa.",
      "Quando você pensa no relacionamento que gostaria de viver, o que mais deseja?",
    ],
    opts: [
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Ter alguém para dividir a vida", to: "rec_dividir" },
    ],
  },

  rec_serio: { lady: ["Entendi. ❤️ Você quer alguém que esteja buscando o mesmo que você.", Q2], opts: Q2_OPTS },
  rec_valor: { lady: ["Faz sentido. ❤️ Você quer estar com alguém e sentir que isso vem dos dois lados.", Q2], opts: Q2_OPTS },
  rec_dividir: { lady: ["Eu entendo o que você busca. ❤️ Ter alguém para compartilhar a vida muda muita coisa.", Q2], opts: Q2_OPTS },

  r2_ninguem: {
    lady: ["Eu imagino como isso pesa. Você quer viver algo, mas parece que nada começa.", "E foi justamente esse tipo de situação que começou a me chamar atenção."],
    opts: CONTINUA,
  },
  r2_frente: {
    lady: ["Isso é frustrante. Parece que começa bem, mas em algum momento tudo para.", "Foi esse tipo de situação que me fez começar a observar mais de perto."],
    opts: CONTINUA,
  },
  r2_machuco: {
    lady: ["Essa parte dói. Você entra querendo que dê certo e acaba saindo machucada.", "Foi vendo isso se repetir que comecei a prestar atenção em algumas coisas."],
    opts: CONTINUA,
  },

  experiencia: {
    lady: [
      "Sabe o que começou a me chamar atenção? Durante muito tempo, observei mulheres completamente diferentes.",
      "Idades diferentes. Jeitos diferentes. Histórias diferentes. Algumas já tinham vivido muitos relacionamentos, outras quase nenhum.",
      "Mas algumas dificuldades apareciam de novo. E eu queria entender por quê.",
    ],
    opts: [{ t: "O que você viu?", to: "autoridade" }],
  },
  autoridade: {
    lady: [
      "Quanto mais eu observava, mais perguntas apareciam. Por que algumas mulheres constroem uma conexão com mais facilidade? E outras, mesmo querendo muito, vivem as mesmas frustrações?",
      "Foi isso que me levou a estudar de verdade comportamento, comunicação e relacionamentos.",
      "E comecei a perceber alguns padrões.",
    ],
    opts: [{ t: "Que padrões?", to: "descoberta" }],
  },
  descoberta: {
    lady: [
      "Percebi uma coisa importante: muitas vezes, o que acontece nos relacionamentos começa antes do relacionamento.",
      "Começa na forma como você se coloca. No que a sua presença mostra. No que você revela. Na maneira como conversa. E até em como reage quando começa a gostar de alguém.",
      "Isso muda completamente a forma de olhar para os relacionamentos.",
    ],
    opts: [{ t: "Como assim?", to: "ponte" }],
  },
  ponte: {
    lady: [
      "Eu poderia passar horas te explicando cada uma dessas coisas.",
      "Mas percebi que precisava organizar tudo de um jeito simples. Algo que você pudesse entender e aplicar.",
      "Foi daí que nasceu o mapa.",
    ],
    opts: [{ t: "Que mapa?", to: "encerramento" }],
  },
  encerramento: {
    lady: [
      "Organizei essa descoberta em cinco passos. Cada um mostra uma parte diferente do caminho.",
      "Não é sobre virar outra mulher. É sobre entender melhor o que você mostra, como agir e também como escolher.",
      "Agora deixa eu te mostrar o que coloquei nesse mapa.",
    ],
    opts: [{ t: "Quero ver o mapa →", cta: true, to: "__done" }],
  },
};

function LadyChat({ onDone }) {
  const [node, setNode] = useState("start");
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showOpts, setShowOpts] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    const n = CHAT[node];
    if (!n) return;
    let cancelled = false;
    let idx = 0;
    const timers = [];
    setShowOpts(false);
    const step = () => {
      if (cancelled) return;
      if (idx >= n.lady.length) { setShowOpts(true); return; }
      const msg = n.lady[idx];
      setTyping(true);
      const dly = 550 + Math.min(msg.length * 12, 1500);
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setMsgs((m) => [...m, { who: "lady", text: msg }]);
        idx += 1;
        timers.push(setTimeout(step, 280));
      }, dly));
    };
    step();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [node]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [msgs, typing, showOpts]);

  function pick(o) {
    setMsgs((m) => [...m, { who: "eu", text: o.t }]);
    setShowOpts(false);
    if (o.to === "__done") { setTimeout(() => onDone(), 500); return; }
    setTimeout(() => setNode(o.to), 350);
  }

  const opts = CHAT[node]?.opts || [];
  return (
    <div className="ldy">
      <div className="ldy-top">
        <div className="ldy-av">{LADY_FOTO ? <img src={LADY_FOTO} alt="Helena" /> : "H"}</div>
        <div className="ldy-id">
          <div className="ldy-nome">Helena</div>
          <div className="ldy-status"><i></i> online</div>
        </div>
      </div>
      <div className="ldy-thread" ref={threadRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"ldy-msg " + (m.who === "lady" ? "lady" : "eu")}>{m.text}</div>
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

const TOTAL = 4;

export default function FunilSwipe({ preco = "R$ 37,90", url = "", slug = "" }) {
  const [step, setStep] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const avancar = () => setStep((s) => Math.min(TOTAL - 1, s + 1));

  useEffect(() => {
    document.body.classList.add("sw-fs");
    return () => document.body.classList.remove("sw-fs");
  }, []);

  useEffect(() => { trackFb("ViewContent", { content_name: CONTEUDO, content_category: "funil", value: VALOR, currency: "BRL" }); }, []);
  useEffect(() => {
    trackFb("FunilPasso", { passo: step + 1 }, "trackCustom");
    let vid = null;
    try { vid = localStorage.getItem("dv_vid"); if (!vid) { vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); localStorage.setItem("dv_vid", vid); } } catch {}
    try { fetch("/api/evento", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo: "mulher_passo", passo: step + 1, vid }) }); } catch {}
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
            <h1 className="sw-h">O Mapa das Mulheres para Destravar as Relações</h1>
            <p className="sw-sub">Descubra o que muitas mulheres estão fazendo diferente.</p>
            <p className="sw-p">Você pode querer alguém para amar, cuidar e dividir a vida. Mas, por algum motivo, isso ainda não aconteceu.</p>
            <p className="sw-p">E você não é a única.</p>
            <p className="sw-p">Foi olhando de perto para muitas mulheres que percebi: mesmo sendo diferentes, muitas enfrentavam as mesmas dificuldades.</p>
          </div>
          <div className="sw-foot">
            <button className="sw-btn" onClick={avancar}>Quero entender</button>
            <span className="sw-hint">leva cerca de 2 minutinhos</span>
          </div>
        </>
      )}

      {/* CHAT COM A HELENA */}
      {step === 1 && <LadyChat onDone={() => setStep(2)} />}

      {/* O MAPA — 5 passos + "não são cinco dicas" */}
      {step === 2 && (
        <>
          <div className="sw-card rola" key="c2">
            <div className="sw-eyebrow">O mapa</div>
            <div className="sw-mapa-titulo">Agora deixa eu te mostrar o mapa</div>
            <div className="sw-mapa-sub">5 passos para você entender o que fazer, despertar interesse e reconhecer quem realmente combina com você.</div>
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
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Ver a jornada completa</button></div>
        </>
      )}

      {/* OFERTA MATERIALIZADA — o que você recebe + transformação + preço */}
      {step === 3 && (
        <>
          <div className="sw-card rola" key="c3">
            <div className="sw-inside">
              <div className="sw-inside-h">O que você recebe</div>
              <ul>
                <li>O mapa completo dos 5 passos, explicado por dentro</li>
                <li>Cenas e reflexões práticas para aplicar na sua vida</li>
                <li>Como perceber quando o interesse vem dos dois lados</li>
                <li>Leitura leve de ~30 minutos, no seu celular</li>
                <li>Acesso imediato e vitalício</li>
              </ul>
            </div>

            <div className="sw-transform">
              <div className="sw-tr antes">
                <div className="sw-tr-l">Antes</div>
                <div className="sw-tr-t">“Será que ele vai gostar de mim?”</div>
              </div>
              <div className="sw-tr depois">
                <div className="sw-tr-l">Depois</div>
                <div className="sw-tr-t">“Esse homem combina com o que eu quero viver?”</div>
              </div>
            </div>

            <div className="sw-deps" style={{ marginTop: 20 }}>
              {["dep5", "dep2", "dep4", "dep6", "dep7"].map((d) => (
                <div key={d} className="sw-depcard">
                  <img src={`/panfleto/depoimentos/${d}.jpg`} alt="Depoimento de uma leitora" loading="lazy" />
                </div>
              ))}
            </div>

            <div className="sw-oferta-card">
              <div className="ic">🔑</div>
              <div className="sw-oferta-t">Como se Tornar a Mulher que “Ele” Procura</div>
              <div className="sw-oferta-d">O mapa completo para destravar seus relacionamentos e aprender uma nova forma de se colocar, se comunicar e escolher.</div>
              <div className="sw-preco">{preco}<small>pagamento único · acesso imediato</small></div>
              {url ? (
                <button type="button" className="pill" onClick={abrirCheckout}>Quero o mapa →</button>
              ) : (
                <span className="pill" style={{ opacity: 0.6, display: "inline-block" }}>Em breve</span>
              )}
              <p className="sw-reassure">~30 minutos de leitura · 7 dias de garantia</p>
            </div>
          </div>
        </>
      )}

      {showCheck && url && <PreCheckout url={url} slug={slug} onClose={() => setShowCheck(false)} />}
    </div>
  );
}
