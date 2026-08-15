"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal: GANCHO → CONVERSA COM A LADY → OFERTA.
//
//  Conversa V3 (9 etapas): a Lady é uma PERCEPTORA conduzindo uma aprendiz por
//  pequenas descobertas. Linguagem simples, feminina, direta, segura — sem
//  "talvez/eu acho/pode ser", sem "homem de valor", sem linguagem espiritual,
//  sem "método" cedo. Funciona pra mulher totalmente solteira também.
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

// ── roteiro do chat (V3, escadinha; on-rails) ───────────────────────────────
const E2 = "Entendi. Essas respostas parecem diferentes, mas têm uma coisa em comum: você quer viver uma relação, e ela não está chegando onde você gostaria. É justamente aí que eu quero começar.";
const E2Q = "Quando você imagina a relação que gostaria de viver, o que mais faz falta hoje?";
const E2_OPTS = [
  { t: "Ter alguém", to: "virada" },
  { t: "Ser valorizada", to: "virada" },
  { t: "Encontrar alguém que queira algo sério", to: "virada" },
  { t: "Sentir que existe reciprocidade", to: "virada" },
];

const CHAT = {
  // 1 — abertura
  start: {
    lady: [
      "Oi, querida. ❤️",
      "Antes de eu te mostrar uma coisa, quero entender onde você está hoje.",
      "Quando você olha para a sua vida amorosa, o que mais te incomoda?",
    ],
    opts: [
      { t: "Não aparece ninguém", to: "rec_a" },
      { t: "Conheço pessoas, mas nunca dá certo", to: "rec_b" },
      { t: "Quando gosto, nunca acontece como eu queria", to: "rec_c" },
      { t: "Estou cansada dessa situação", to: "rec_d" },
    ],
  },
  // 2 — identificação (adapta à resposta e converge)
  rec_a: { lady: ["Eu entendo. Sentir que ninguém aparece cansa — e mexe com a esperança da gente.", E2, E2Q], opts: E2_OPTS },
  rec_b: { lady: ["Sei bem. Conhecer gente e nada engatar vai esvaziando a gente aos poucos.", E2, E2Q], opts: E2_OPTS },
  rec_c: { lady: ["Entendo. Gostar e ver a história não ir para a frente dói de um jeito diferente.", E2, E2Q], opts: E2_OPTS },
  rec_d: { lady: ["Eu te entendo. E é honesto admitir esse cansaço — a maioria finge que está tudo bem.", E2, E2Q], opts: E2_OPTS },
  // 3 — primeira virada
  virada: {
    lady: [
      "Entendi. Agora presta atenção numa coisa.",
      "Você não precisa aprender a ser perfeita para viver uma boa relação. Também não precisa aprender a fazer alguém correr atrás de você. E só esperar a pessoa certa aparecer também não resolve tudo.",
      "Existem coisas que você pode aprender sobre a maneira como se posiciona, se comunica e se relaciona. E o mais importante: isso começa muito antes de existir um relacionamento.",
    ],
    opts: [{ t: "Quero entender", to: "lacuna" }],
  },
  // 4 — a lacuna
  lacuna: {
    lady: [
      "Deixa eu te mostrar o que eu quero dizer. Você provavelmente já ouviu três tipos de conselho:",
      "“Espere” — uma hora a pessoa certa aparece. “Melhore” — cuide de você, aumente a autoestima, seja a sua melhor versão. “Jogue” — demonstre menos, faça a outra pessoa correr atrás.",
      "Tudo isso pode até parecer fazer sentido. Mas nada disso responde uma pergunta importante: o que você está transmitindo sem perceber?",
      "O jeito que você fala. Como reage. O que demonstra. O que aceita. Como se posiciona. Tudo isso comunica alguma coisa — mesmo quando você não percebe.",
    ],
    opts: [{ t: "Como assim?", to: "descoberta" }],
  },
  // 5 — a descoberta (Elegância Prática)
  descoberta: {
    lady: [
      "É aqui que eu quero que você preste atenção. Não é para você virar outra mulher. Não é para fingir desinteresse. Não é para manipular ninguém.",
      "É aprender a se posicionar de um jeito diferente: saber o que mostrar, o que falar, quando avançar, quando parar. E continuar sendo você.",
      "Foi observando isso que eu percebi que existe uma forma diferente de participar da própria vida amorosa. Eu chamo de Elegância Prática. Não é parecer perfeita, não é ser difícil, não é joguinho — é se posicionar sem deixar de ser você.",
    ],
    opts: [{ t: "Quero entender melhor", to: "exemplo" }],
  },
  // 6 — na prática
  exemplo: {
    lady: [
      "Vou te dar um exemplo simples. Imagine que você conhece alguém e percebe que está interessada.",
      "Você pode pensar: “preciso mostrar que gostei, para ele não perder o interesse.” Ou: “preciso me segurar, para ele não achar que estou disponível demais.” As duas te colocam tentando controlar o que o outro vai pensar.",
      "Existe uma terceira maneira: você demonstra interesse porque está realmente interessada. É receptiva, conversa, mostra que gostou — e continua vivendo a sua vida. Sem teatrinho, sem controlar cada reação, sem fazer sozinha o trabalho que era dos dois. Percebe a diferença?",
    ],
    opts: [
      { t: "Sim, agora entendi", to: "ampliacao" },
      { t: "Nunca tinha pensado assim", to: "ampliacao" },
    ],
  },
  // 7 — ampliação + a virada de posição
  ampliacao: {
    lady: [
      "E isso é só um exemplo. A mesma lógica aparece em muito mais coisas: em como você começa uma conversa, como demonstra interesse, como reage quando alguém se afasta, na hora de colocar um limite… e principalmente na hora de decidir se vale a pena continuar.",
      "Porque existe uma virada importante quando você aprende isso. Você para de pensar “como faço essa pessoa gostar de mim?” e começa a pensar “o que essa relação está me mostrando?”.",
      "Isso muda a posição que você ocupa. Você deixa de só esperar para ser escolhida — e começa a também escolher.",
    ],
    opts: [{ t: "Faz sentido…", to: "esperanca" }],
  },
  // 8 — esperança
  esperanca: {
    lady: [
      "E deixa eu te contar outra coisa. Existem pessoas que querem exatamente o que você quer: companhia, carinho, parceria, construir algo de verdade.",
      "Só que querer uma relação não basta. Você também precisa saber reconhecer uma boa conexão, se posicionar dentro dela e perceber quando existe reciprocidade. E ninguém ensina isso direito.",
      "Foi por isso que eu organizei tudo isso em uma jornada.",
    ],
    opts: [{ t: "Me mostra", to: "oferta" }],
  },
  // 9 — transição para a oferta
  oferta: {
    lady: [
      "Eu coloquei tudo isso em “Como se Tornar a Mulher que Ele Procura” — uma jornada prática para você entender o que transmite, como se posicionar, como se comunicar, como demonstrar interesse, e como parar de carregar sozinha uma relação que deveria ser dos dois.",
      "Você não precisa virar outra mulher. Precisa aprender a enxergar algumas coisas que ninguém te mostrou. E é exatamente isso que eu quero te ensinar. 🤍",
    ],
    opts: [{ t: "Quero descobrir →", cta: true, to: "__done" }],
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
      const dly = 600 + Math.min(msg.length * 14, 1700);
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setMsgs((m) => [...m, { who: "lady", text: msg }]);
        idx += 1;
        timers.push(setTimeout(step, 300));
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
        <div className="ldy-av">{LADY_FOTO ? <img src={LADY_FOTO} alt="A Lady" /> : "L"}</div>
        <div className="ldy-id">
          <div className="ldy-nome">A Lady</div>
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

const TOTAL = 3;

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

      {/* GANCHO */}
      {step === 0 && (
        <>
          <div className="sw-card rola" key="c0">
            <div className="sw-eyebrow">Damas Virtuosas</div>
            <h1 className="sw-h">Por que ele percebe <em>uma</em> — e passa direto por outra?</h1>
            <p className="sw-p">Você já se perguntou isso?</p>
            <p className="sw-p">Duas mulheres podem ser bonitas. As duas podem ser interessantes. As duas podem querer um relacionamento. Mas, mesmo assim…</p>
            <p className="sw-q">uma desperta interesse e a outra parece passar despercebida.</p>
            <p className="sw-p">Por quê? A resposta pode ser bem diferente do que você imagina.</p>
          </div>
          <div className="sw-foot">
            <button className="sw-btn" onClick={avancar}>Quero entender</button>
            <span className="sw-hint">leva 2 minutinhos</span>
          </div>
        </>
      )}

      {/* CONVERSA COM A LADY */}
      {step === 1 && <LadyChat onDone={() => setStep(2)} />}

      {/* OFERTA */}
      {step === 2 && (
        <>
          <div className="sw-card rola" key="c2">
            <div className="sw-eyebrow">Quem já atravessou a porta</div>
            <div className="sw-deps">
              {["dep5", "dep2", "dep4", "dep6", "dep7"].map((d) => (
                <div key={d} className="sw-depcard">
                  <img src={`/panfleto/depoimentos/${d}.jpg`} alt="Depoimento de uma leitora" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="sw-oferta-card">
              <div className="ic">🔑</div>
              <div className="sw-oferta-t">Como se Tornar a Mulher que “Ele” Procura</div>
              <div className="sw-oferta-d">Uma jornada prática para entender o que você transmite, como se posiciona, como se comunica, como demonstra interesse — e como parar de carregar sozinha uma relação que deveria ser dos dois.</div>
              <div className="sw-preco">{preco}<small>pagamento único · acesso imediato</small></div>
              {url ? (
                <button type="button" className="pill" onClick={abrirCheckout}>Quero descobrir →</button>
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
