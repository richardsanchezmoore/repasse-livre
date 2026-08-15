"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal: GANCHO → CONVERSA COM A LADY → OFERTA.
//
//  Conversa V4 (ritmo de WhatsApp real): Lady fala → mulher responde → Lady
//  REAGE → conduz → mulher responde → descoberta. MÁX 3 opções por interação.
//  Cada resposta gera reação. Linguagem simples ("se colocar", "mostrar",
//  "interesse dos dois lados"). Autoridade da Lady pela trajetória. Sem
//  "homem de valor", sem "método"/PERLA no funil, sem joguinho como eixo.
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

// ── roteiro do chat (V4, ritmo real; on-rails) ──────────────────────────────
// 2ª pergunta (o que mais pesa) — vem depois da Lady reagir à 1ª resposta.
const Q2 = "E hoje, o que mais pesa para você?";
const Q2_OPTS = [
  { t: "Não encontrar ninguém", to: "pesa" },
  { t: "Encontrar, mas nunca dar certo", to: "pesa" },
  { t: "Acabar sempre na mesma situação", to: "pesa" },
];

const CHAT = {
  // início — Lady se apresenta e faz a 1ª pergunta (3 opções)
  start: {
    lady: [
      "Oi, querida. ❤️ Que bom ter você aqui.",
      "Quero entender uma coisa sobre você. Quando pensa no relacionamento que gostaria de viver, o que mais deseja?",
    ],
    opts: [
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Ter alguém para dividir a vida", to: "rec_dividir" },
    ],
  },
  // reações à 1ª resposta (cada uma termina com a 2ª pergunta)
  rec_serio: {
    lady: [
      "Eu entendo. ❤️ Porque quando você quer algo sério, não adianta encontrar alguém que só quer passar o tempo.",
      "Você quer alguém que realmente queira estar ali. E é justamente aí que muita mulher acaba se confundindo.",
      Q2,
    ],
    opts: Q2_OPTS,
  },
  rec_valor: {
    lady: [
      "Eu entendo. ❤️ Porque não adianta estar com alguém e continuar se sentindo sozinha.",
      "Você se importa, se entrega, está presente… e também quer sentir que isso vem de volta. E é justamente aí que muita mulher acaba se confundindo.",
      Q2,
    ],
    opts: Q2_OPTS,
  },
  rec_dividir: {
    lady: [
      "Eu entendo. ❤️ No fundo, não é simplesmente ter alguém.",
      "É ter alguém que realmente queira estar ao seu lado. E existe uma grande diferença entre essas duas coisas.",
      Q2,
    ],
    opts: Q2_OPTS,
  },
  // reação à 2ª resposta (converge)
  pesa: {
    lady: [
      "Eu entendo. E sabe o que é interessante? Essas situações parecem diferentes.",
      "Mas eu comecei a perceber que muitas mulheres chegavam ao mesmo ponto por caminhos diferentes. E isso me fez querer entender o que estava acontecendo.",
    ],
    opts: [{ t: "Quero saber", to: "descoberta1" }],
  },
  // primeira descoberta
  descoberta1: {
    lady: [
      "Porque conhecer alguém é uma coisa. Fazer uma relação acontecer de verdade é outra.",
      "Você pode conhecer pessoas, sair, conversar, se cuidar — fazer tudo aquilo que dizem que você deveria fazer. E ainda assim não chegar ao relacionamento que procura.",
      "Por quê? Foi justamente essa pergunta que comecei a investigar.",
    ],
    opts: [{ t: "Me mostra", to: "conselhos" }],
  },
  // os conselhos que ela já ouviu
  conselhos: {
    lady: [
      "E provavelmente você já ouviu alguns desses conselhos: “espere, uma hora a pessoa certa aparece”, “melhore, cuide de você, seja a sua melhor versão”, “faça ele correr atrás, não demonstre demais, não fique tão disponível”.",
      "Você já deve ter ouvido pelo menos um deles. E alguns até parecem fazer sentido.",
      "Mas tem uma pergunta que quase ninguém faz: o que você está mostrando sem perceber?",
      "O jeito que você fala. O jeito que responde. O que demonstra. O que aceita. A forma como age. Tudo isso diz alguma coisa — mesmo quando você não percebe.",
    ],
    opts: [{ t: "Como assim?", to: "autoridade" }],
  },
  // autoridade da Lady (trajetória)
  autoridade: {
    lady: [
      "É aqui que eu quero te contar uma coisa. Durante muito tempo, eu observei mulheres muito diferentes: idades diferentes, aparências diferentes, jeitos diferentes, histórias diferentes.",
      "Mas algumas dificuldades apareciam de novo e de novo. Algumas se doavam demais. Outras tinham medo de mostrar o que sentiam. Outras não sabiam como fazer uma relação avançar. E isso começou a me chamar atenção.",
      "Eu queria entender por quê. Foi então que comecei a estudar mais sobre comportamento, comunicação e relacionamentos. E quanto mais eu estudava, mais uma coisa ficava clara: não era só uma questão de beleza ou sorte. Existia algo acontecendo antes.",
    ],
    opts: [{ t: "Quero saber mais", to: "elegancia" }],
  },
  // a descoberta da Elegância Prática
  elegancia: {
    lady: [
      "E foi aí que comecei a enxergar tudo de outra maneira. Não estou falando para você manipular ninguém. Não estou falando para fazer joguinhos. E muito menos para virar outra pessoa.",
      "Estou falando de aprender a se colocar melhor: saber o que mostrar, o que falar, quando demonstrar, quando parar, perceber quando existe interesse dos dois lados. E, principalmente, não carregar sozinha uma relação que deveria ser construída por dois.",
      "Foi observando tudo isso que eu comecei a chamar essa forma diferente de se relacionar de Elegância Prática. É simples: é saber se colocar sem deixar de ser você.",
    ],
    opts: [{ t: "Quero entender", to: "exemplo" }],
  },
  // exemplo prático
  exemplo: {
    lady: [
      "Vou te dar um exemplo. Imagine que você conheça alguém e goste dessa pessoa.",
      "Você pode pensar: “preciso mostrar bastante que gostei.” Ou: “preciso me segurar para não parecer disponível demais.” Percebe? Nos dois casos, você está tentando controlar o que a outra pessoa vai pensar.",
      "Existe uma terceira maneira: você mostra que gostou, conversa, é carinhosa, demonstra interesse — e continua vivendo a sua vida. Sem joguinho, sem fingir, sem controlar cada resposta, e sem fazer sozinha aquilo que deveria acontecer dos dois lados. Percebe a diferença?",
    ],
    opts: [{ t: "Sim, agora entendi", to: "grandevirada" }],
  },
  // a grande virada
  grandevirada: {
    lady: [
      "E isso não vale só para o começo. A mesma coisa aparece quando você conhece alguém, começa a conversar, percebe que está gostando, coloca um limite, sente que a outra pessoa está se afastando, ou precisa decidir se continua.",
      "Porque quando você começa a enxergar essas coisas, uma pergunta muda. Você deixa de pensar “como faço essa pessoa gostar de mim?” e começa a pensar “o que essa pessoa está me mostrando?”.",
      "Isso muda a sua posição. Você não fica apenas esperando para ser escolhida. Você também começa a escolher.",
    ],
    opts: [{ t: "Quero aprender", to: "esperanca" }],
  },
  // esperança
  esperanca: {
    lady: [
      "E quero que você guarde uma coisa. Existem pessoas procurando o mesmo que você: querem companhia, carinho, parceria, construir uma vida a dois.",
      "Você não precisa aprender a fazer qualquer pessoa gostar de você. Precisa aprender a reconhecer quem combina com o que você procura — e saber como agir quando essa pessoa aparecer.",
      "Foi por isso que eu organizei tudo isso em uma jornada.",
    ],
    opts: [{ t: "Me mostra", to: "oferta" }],
  },
  // oferta
  oferta: {
    lady: [
      "Eu coloquei tudo isso em “Como se Tornar a Mulher que Ele Procura” — uma jornada prática para você aprender o que mostra sem perceber, como se colocar, como conversar, como mostrar interesse, como perceber quando existe interesse dos dois lados, e como parar de carregar sozinha uma relação que deveria ser construída por dois.",
      "Você não precisa virar outra mulher. Não precisa aprender joguinhos. Não precisa fingir desinteresse. Precisa aprender a enxergar algumas coisas que ninguém ensinou você a perceber. 🤍",
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

      {/* GANCHO (sem branding — o desejo) */}
      {step === 0 && (
        <>
          <div className="sw-card rola" key="c0">
            <h1 className="sw-h">Por que você ainda não está vivendo o relacionamento que <em>gostaria</em>?</h1>
            <p className="sw-p">Você pode querer algo simples. Alguém para amar, cuidar e dividir a vida. Alguém que queira estar com você. Que te valorize.</p>
            <p className="sw-p">Mas, por algum motivo, isso ainda não aconteceu. E você já deve ter se perguntado:</p>
            <p className="sw-q">“O que está faltando?”</p>
            <p className="sw-p">Foi essa pergunta que me fez olhar mais de perto para a história de muitas mulheres.</p>
            <p className="sw-q">E encontrei algo que se repetia.</p>
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
              <div className="sw-oferta-d">Uma jornada prática para você aprender o que mostra sem perceber, como se colocar, como conversar, como mostrar interesse, como perceber quando existe interesse dos dois lados — e como parar de carregar sozinha uma relação que deveria ser construída por dois.</div>
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
