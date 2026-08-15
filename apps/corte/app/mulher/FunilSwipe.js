"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal: GANCHO → CONVERSA COM A LADY → OFERTA.
//
//  Conversa V4 (10 etapas): a Lady é uma PERCEPTORA que observou→estudou→achou
//  padrões→ensina. Autoridade pela trajetória (não títulos). Frase-mãe: "Por que
//  você ainda não está vivendo o relacionamento que gostaria?". Foco no DESEJO
//  presente (não no passado). Sem "talvez/eu acho" como persuasão, sem "homem de
//  valor", sem linguagem espiritual/coach, sem "método"/PERLA no funil.
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

// ── roteiro do chat (V4, 10 etapas; on-rails) ───────────────────────────────
const Q1_OPTS = [
  { t: "Encontrar alguém que queira algo sério", to: "identificacao" },
  { t: "Ter reciprocidade", to: "identificacao" },
  { t: "Me sentir valorizada", to: "identificacao" },
  { t: "Ter alguém para dividir a vida", to: "identificacao" },
  { t: "Tudo isso", to: "identificacao" },
];

const CHAT = {
  // 1 — abertura
  start: {
    lady: [
      "Oi, querida. ❤️",
      "Agora deixa eu te fazer uma pergunta.",
      "Quando você pensa no relacionamento que gostaria de viver, o que mais importa para você?",
    ],
    opts: Q1_OPTS,
  },
  // 2 + 3 — identificação + primeira virada
  identificacao: {
    lady: [
      "Entendi. E sabe o que eu percebi ao longo dos anos? As respostas mudam, mas no fundo muitas mulheres estão procurando a mesma coisa: uma relação em que não precisem ficar tentando convencer alguém a ficar.",
      "Elas querem interesse. Querem reciprocidade. Querem sentir que existe vontade dos dois lados. Parece simples — mas existe uma parte dessa história que quase ninguém ensina.",
      "Porque encontrar uma pessoa é uma coisa. Construir uma conexão que realmente tenha espaço para virar relacionamento é outra.",
      "Você pode conhecer pessoas, sair, conversar, se cuidar — fazer tudo o que dizem que você deveria fazer — e ainda assim não chegar ao relacionamento que deseja. Por quê? É exatamente essa pergunta que eu quero responder.",
    ],
    opts: [{ t: "Quero entender", to: "conselhos" }],
  },
  // 4 — os conselhos que ela já ouviu
  conselhos: {
    lady: [
      "Provavelmente você já recebeu alguns desses conselhos: “uma hora a pessoa certa aparece”, “cuide de você e seja a sua melhor versão”, “não demonstre demais”, “deixe a outra pessoa correr atrás”, “não fique tão disponível”.",
      "Alguns até fazem sentido. Mas existe uma pergunta que fica de fora: o que você está comunicando sem perceber?",
      "Porque antes de existir um relacionamento, já existe uma percepção. O jeito que você fala. Como responde. O que demonstra. O que aceita. Como se posiciona. Tudo isso comunica — mesmo quando você não está tentando comunicar nada.",
    ],
    opts: [{ t: "Como assim?", to: "autoridade" }],
  },
  // 5 — autoridade da Lady (trajetória, não títulos)
  autoridade: {
    lady: [
      "É justamente isso que começou a me chamar atenção. Durante muito tempo, eu observei mulheres completamente diferentes — idades, aparências, personalidades e histórias diferentes.",
      "Mas algumas dificuldades apareciam de novo e de novo. Os padrões se repetiam. Isso me fez querer entender o que realmente estava acontecendo, e passei a aprofundar meus estudos sobre comportamento, comunicação e relacionamentos.",
      "E quanto mais eu estudava, mais uma coisa ficava clara: não era simplesmente beleza, sorte ou encontrar a pessoa certa. Existia uma parte da dinâmica que acontecia antes.",
    ],
    opts: [{ t: "E o que você descobriu?", to: "descoberta" }],
  },
  // 6 — a descoberta (Elegância Prática)
  descoberta: {
    lady: [
      "Foi aí que eu comecei a enxergar uma maneira diferente de olhar para tudo isso. Não é manipular alguém. Não é fazer joguinho. E não é para você virar outra mulher.",
      "É aprender a se posicionar melhor: saber o que mostrar, o que falar, quando demonstrar, quando parar, reconhecer reciprocidade. E, principalmente, não precisar carregar sozinha uma relação que deveria ser construída por dois.",
      "Foi observando tudo isso que eu comecei a chamar essa forma diferente de se relacionar de Elegância Prática. É simples: é saber se posicionar sem precisar deixar de ser você.",
    ],
    opts: [{ t: "Quero entender melhor", to: "exemplo" }],
  },
  // 7 — exemplo prático
  exemplo: {
    lady: [
      "Vou te dar um exemplo. Imagine que você conhece alguém e gosta dessa pessoa.",
      "Você pode pensar: “preciso demonstrar bastante para ele perceber que estou interessada.” Ou: “preciso me segurar para não parecer disponível demais.” Percebe? Nos dois casos, você está tentando controlar a reação da outra pessoa.",
      "Existe uma terceira maneira: você demonstra interesse porque realmente está interessada. É receptiva, conversa, mostra que gostou — e continua vivendo a sua vida. Sem joguinho, sem teatrinho, sem controlar cada resposta, e sem fazer sozinha aquilo que deveria acontecer dos dois lados.",
      "Essa diferença parece pequena. Mas muda muita coisa.",
    ],
    opts: [{ t: "Agora eu entendi", to: "perspectiva" }],
  },
  // 8 — nova perspectiva
  perspectiva: {
    lady: [
      "E isso não serve só para uma conversa. A mesma lógica aparece quando você conhece alguém, começa a conversar, demonstra interesse, percebe que está gostando, coloca um limite, percebe que a outra pessoa está se afastando, ou decide se continua ou não.",
      "Porque existe uma mudança importante quando você começa a enxergar isso. Você para de pensar “como faço essa pessoa gostar de mim?” e começa a pensar “o que essa relação está me mostrando?”.",
      "Você deixa de ficar apenas esperando para ser escolhida. Você também começa a escolher.",
    ],
    opts: [{ t: "Faz sentido…", to: "esperanca" }],
  },
  // 9 — esperança
  esperanca: {
    lady: [
      "E existe uma coisa que eu quero que você guarde: existem pessoas procurando o mesmo tipo de relação que você. Pessoas que querem companhia, parceria, carinho, construir algo de verdade.",
      "O que você precisa aprender não é fazer qualquer pessoa gostar de você. É reconhecer uma boa conexão, se posicionar dentro dela e perceber quando existe reciprocidade.",
      "Foi por isso que eu organizei tudo isso em uma jornada.",
    ],
    opts: [{ t: "Me mostra", to: "oferta" }],
  },
  // 10 — oferta
  oferta: {
    lady: [
      "Eu coloquei tudo isso em “Como se Tornar a Mulher que Ele Procura” — uma jornada prática para você entender o que transmite, como se posicionar, como se comunicar, como demonstrar interesse, como reconhecer reciprocidade, e como parar de carregar sozinha uma relação que deveria ser construída por dois.",
      "Você não precisa virar outra mulher. Não precisa aprender joguinhos. Não precisa fingir desinteresse. Precisa aprender a enxergar algumas coisas que ninguém te ensinou a perceber. E é exatamente isso que eu quero te ensinar. 🤍",
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

      {/* GANCHO (sem branding — só atenção → identificação → curiosidade) */}
      {step === 0 && (
        <>
          <div className="sw-card rola" key="c0">
            <h1 className="sw-h">Por que você ainda não está vivendo o relacionamento que <em>gostaria</em>?</h1>
            <p className="sw-p">Você pode querer algo simples. Alguém para dividir a vida. Uma relação com carinho, interesse e reciprocidade. Alguém que realmente queira estar ali.</p>
            <p className="sw-p">Mas, por algum motivo, isso ainda não aconteceu do jeito que você gostaria. E você já deve ter se perguntado: <em>“o que está faltando?”</em></p>
            <p className="sw-p">Foi essa pergunta que me fez começar a observar uma coisa: mulheres muito diferentes, com histórias completamente diferentes, enfrentando dificuldades muito parecidas.</p>
            <p className="sw-q">E havia algo por trás disso que quase ninguém ensinava.</p>
            <p className="sw-p">É isso que eu quero te mostrar.</p>
          </div>
          <div className="sw-foot">
            <button className="sw-btn" onClick={avancar}>Quero entender</button>
            <span className="sw-hint">leva cerca de 2 minutinhos</span>
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
              <div className="sw-oferta-d">Uma jornada prática para entender o que você transmite, como se posiciona, como se comunica, como demonstra interesse, como reconhecer reciprocidade — e como parar de carregar sozinha uma relação que deveria ser construída por dois.</div>
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
