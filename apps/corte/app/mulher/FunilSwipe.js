"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal: GANCHO → CONVERSA COM A LADY → OFERTA.
//
//  Conversa V5 (naturalidade acima de tudo — parecer WhatsApp real):
//   • UMA ideia por bolha (cada "Depois:" do roteiro = uma mensagem separada).
//   • MÁX 3 opções por pergunta; a Lady reconhece a resposta antes de conduzir.
//   • Linguagem de criança de 10 anos entender; nada que exija interpretação.
//   • Evitar repetição em bolhas consecutivas (você/hoje/quer/…).
//   • Autoridade da Lady pela trajetória. Sem "método"/PERLA no funil.
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

// ── roteiro do chat (V5; on-rails) ──────────────────────────────────────────
const Q2 = "E como estão as coisas hoje?";
const Q2_OPTS = [
  { t: "Não aparece ninguém", to: "r2_ninguem" },
  { t: "Aparece, mas não vai para frente", to: "r2_frente" },
  { t: "Eu acabo me machucando", to: "r2_machuco" },
];
const CONTINUA = [{ t: "Me conta", to: "descoberta1" }];

const CHAT = {
  start: {
    lady: [
      "Oi, querida. ❤️ Que bom ter você aqui.",
      "Quero te fazer uma pergunta.",
      "Quando você pensa no relacionamento que gostaria de viver, o que mais deseja?",
    ],
    opts: [
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Ter alguém para dividir a vida", to: "rec_dividir" },
    ],
  },

  rec_serio: {
    lady: ["Eu entendo. ❤️", "Você quer alguém que queira o mesmo que você.", Q2],
    opts: Q2_OPTS,
  },
  rec_valor: {
    lady: ["Eu entendo. ❤️", "Você quer estar com alguém e se sentir realmente importante para essa pessoa.", Q2],
    opts: Q2_OPTS,
  },
  rec_dividir: {
    lady: ["Eu entendo. ❤️", "No fundo, você quer alguém que realmente queira estar ao seu lado.", Q2],
    opts: Q2_OPTS,
  },

  r2_ninguem: {
    lady: ["Eu entendo.", "É difícil querer viver algo e não encontrar ninguém que pareça querer o mesmo.", "Foi justamente isso que começou a me chamar atenção."],
    opts: CONTINUA,
  },
  r2_frente: {
    lady: ["Eu entendo.", "Às vezes alguém aparece, existe interesse, mas a história simplesmente não avança.", "Foi justamente isso que começou a me chamar atenção."],
    opts: CONTINUA,
  },
  r2_machuco: {
    lady: ["Eu entendo. ❤️", "Quando você se entrega e não recebe o mesmo de volta, isso machuca.", "Foi justamente isso que começou a me chamar atenção."],
    opts: CONTINUA,
  },

  descoberta1: {
    lady: [
      "Sabe o que eu comecei a perceber?",
      "Mulheres muito diferentes passavam pelas mesmas dificuldades.",
      "Algumas não conseguiam conhecer ninguém. Outras conheciam, mas nada ia para frente. E outras acabavam se machucando.",
      "Eu queria entender por quê.",
    ],
    opts: [{ t: "Quero saber", to: "historia" }],
  },
  historia: {
    lady: [
      "Foi aí que comecei a observar tudo isso mais de perto.",
      "Idades diferentes. Jeitos diferentes. Histórias diferentes.",
      "Mas algumas coisas se repetiam.",
      "Algumas se entregavam demais. Outras tinham medo de mostrar o que sentiam. Outras não sabiam como fazer uma relação avançar.",
      "E eu comecei a estudar esse assunto de verdade.",
    ],
    opts: [{ t: "O que você descobriu?", to: "autoridade" }],
  },
  autoridade: {
    lady: [
      "Quanto mais eu estudava, mais uma coisa ficava clara:",
      "não era só uma questão de beleza. E também não era falta de sorte.",
      "Tinha coisa acontecendo antes.",
    ],
    opts: [{ t: "Antes do quê?", to: "lacuna" }],
  },
  lacuna: {
    lady: [
      "Antes de um relacionamento começar, muita coisa já está acontecendo.",
      "O jeito que você fala. O jeito que responde. O que mostra. O que aceita. A forma como age.",
      "Tudo isso passa uma mensagem.",
    ],
    opts: [{ t: "Como assim?", to: "caminhos" }],
  },
  caminhos: {
    lady: [
      "Provavelmente você já ouviu vários conselhos sobre isso.",
      "“Espere.” Uma hora alguém aparece.",
      "“Melhore.” Cuide de você e seja sua melhor versão.",
      "“Faça ele correr atrás.” Não demonstre demais, não fique tão disponível.",
      "Mas tem uma coisa que esses conselhos não ensinam.",
    ],
    opts: [{ t: "O que eles não ensinam?", to: "central" }],
  },
  central: {
    lady: [
      "O que você está mostrando sem perceber?",
      "Você pode estar tentando fazer uma coisa… e a outra pessoa entender outra.",
      "E isso muda muita coisa.",
    ],
    opts: [{ t: "Quero entender", to: "elegancia" }],
  },
  elegancia: {
    lady: [
      "Foi aí que comecei a enxergar os relacionamentos de outra maneira.",
      "Não é manipular ninguém. Não é fazer joguinho. E muito menos virar outra pessoa.",
      "É aprender a se colocar melhor.",
      "Saber o que mostrar. Saber o que falar. Saber quando demonstrar. Saber quando parar. E perceber quando o interesse vem dos dois lados.",
      "Foi observando tudo isso que eu dei um nome a essa forma diferente de se relacionar:",
      "Elegância Prática.",
      "É saber se colocar sem deixar de ser você.",
    ],
    opts: [{ t: "Me mostra na prática", to: "exemplo" }],
  },
  exemplo: {
    lady: [
      "Vou te dar um exemplo simples.",
      "Você conhece alguém e gosta dessa pessoa.",
      "Aí pode pensar: “preciso mostrar bastante que gostei.”",
      "Ou: “preciso me segurar para não parecer disponível demais.”",
      "Nos dois casos, você está tentando controlar o que ele vai pensar.",
      "Mas existe outra maneira.",
    ],
    opts: [{ t: "Qual?", to: "terceiravia" }],
  },
  terceiravia: {
    lady: [
      "Você pode mostrar que gostou. Pode conversar. Pode ser carinhosa. Pode demonstrar interesse.",
      "E continuar vivendo a sua vida.",
      "Sem fingir. Sem joguinho. Sem tentar controlar cada resposta.",
      "E sem fazer sozinha o que deveria acontecer dos dois lados.",
      "Percebe a diferença?",
    ],
    opts: [{ t: "Sim, agora entendi", to: "grandevirada" }],
  },
  grandevirada: {
    lady: [
      "E isso não serve só para o começo.",
      "A mesma coisa aparece quando você começa a conversar com alguém. Quando percebe que está gostando. Quando precisa colocar um limite. Quando sente que a pessoa está se afastando. Ou quando precisa decidir se continua.",
      "Porque existe uma pergunta que muda tudo.",
      "Em vez de pensar: “como faço essa pessoa gostar de mim?”",
      "Você começa a pensar: “o que essa pessoa está me mostrando?”",
      "Isso muda a sua posição.",
      "Você deixa de ficar apenas esperando para ser escolhida.",
      "Você também começa a escolher.",
    ],
    opts: [{ t: "Quero aprender isso", to: "esperanca" }],
  },
  esperanca: {
    lady: [
      "E quero que você guarde uma coisa.",
      "Existem pessoas procurando o mesmo que você.",
      "Pessoas que querem carinho. Querem companhia. Querem parceria. Querem construir uma vida a dois.",
      "Você não precisa aprender a fazer qualquer pessoa gostar de você.",
      "Precisa aprender a reconhecer quem combina com o que você procura.",
      "E saber como agir quando essa pessoa aparecer.",
    ],
    opts: [{ t: "Quero aprender", to: "transicao" }],
  },
  transicao: {
    lady: [
      "Foi por isso que eu organizei tudo isso em uma jornada.",
      "Uma jornada para você entender melhor o que mostra sem perceber, como se colocar, como conversar, como mostrar interesse, e como perceber quando o interesse vem dos dois lados.",
      "Sem precisar virar outra mulher. Sem joguinhos. Sem fingir desinteresse.",
    ],
    opts: [{ t: "Ver a jornada", cta: true, to: "__done" }],
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
      const dly = 550 + Math.min(msg.length * 13, 1500);
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
              <div className="sw-oferta-d">Uma jornada prática para você enxergar coisas que ninguém ensinou você a perceber.</div>
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
