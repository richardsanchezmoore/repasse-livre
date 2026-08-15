"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — landing principal: GANCHO → CONVERSA COM A LADY → OFERTA.
//
//  V5 (impulso vindo do Meta): Card 1 TANGÍVEL (mostrar o bolo, não a receita) e
//  curto (cabe no iPhone 14 sem rolar). Conversa natural, RITMO AGRUPADO (2-3
//  frases por bolha quando é uma ideia só — nada de picotar demais). Reações
//  variadas. A descoberta ("você pode estar querendo uma coisa e mostrando
//  outra") e o exemplo concreto ANTES de nomear a Elegância Prática. Linguagem
//  de criança de 10 anos entender. Sem "método"/PERLA no funil.
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
const AO_QUE = [{ t: "O quê?", to: "descoberta" }];

const CHAT = {
  start: {
    lady: [
      "Oi, querida. ❤️",
      "Quero entender uma coisa sobre você. Quando pensa no relacionamento que gostaria de viver, o que mais deseja?",
    ],
    opts: [
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Ter alguém para dividir a vida", to: "rec_dividir" },
    ],
  },

  rec_serio: { lady: ["Entendi. ❤️ Você quer alguém que queira o mesmo que você.", Q2], opts: Q2_OPTS },
  rec_valor: { lady: ["Faz sentido. ❤️ Você quer estar com alguém e se sentir realmente importante para essa pessoa.", Q2], opts: Q2_OPTS },
  rec_dividir: { lady: ["Entendi. ❤️ No fundo, você quer alguém que realmente queira estar ao seu lado.", Q2], opts: Q2_OPTS },

  r2_ninguem: {
    lady: ["É difícil querer viver algo e não encontrar ninguém que pareça querer o mesmo.", "Sabe o que começou a me chamar atenção?"],
    opts: AO_QUE,
  },
  r2_frente: {
    lady: ["Isso acontece com mais mulheres do que você imagina. Às vezes existe interesse, mas a história simplesmente não avança.", "E foi aí que comecei a prestar atenção em uma coisa."],
    opts: AO_QUE,
  },
  r2_machuco: {
    lady: ["Essa parte dói mesmo. Você se entrega e espera que o outro faça o mesmo.", "E foi aí que comecei a prestar atenção em uma coisa."],
    opts: AO_QUE,
  },

  // Card 3 — a descoberta
  descoberta: {
    lady: [
      "Você pode estar querendo uma coisa — e mostrando outra.",
      "E a outra pessoa reage ao que vê. Não ao que você sente por dentro.",
    ],
    opts: [{ t: "Como assim?", to: "explica" }],
  },
  explica: {
    lady: [
      "Você pode querer um relacionamento sério. Pode querer alguém presente. Pode querer carinho.",
      "Mas algumas atitudes podem passar outra mensagem.",
    ],
    opts: [{ t: "Me conta mais", to: "autoridade" }],
  },

  // Card 4 — autoridade (trajetória)
  autoridade: {
    lady: [
      "Sabe o que mais me chamou atenção? Eu comecei a perceber que mulheres muito diferentes passavam pelas mesmas dificuldades.",
      "Idades diferentes. Jeitos diferentes. Histórias diferentes. Mas algumas coisas se repetiam.",
      "Foi aí que comecei a estudar esse assunto de verdade.",
    ],
    opts: [{ t: "O que se repetia?", to: "repetia" }],
  },
  repetia: {
    lady: [
      "Algumas se entregavam demais. Outras tinham medo de mostrar o que sentiam. Outras não sabiam quando insistir e quando parar.",
      "E foi aí que comecei a enxergar os relacionamentos de outra maneira.",
    ],
    opts: [{ t: "Me dá um exemplo", to: "exemplo" }],
  },

  // Card 5 — exemplo concreto
  exemplo: {
    lady: [
      "Você começa a conversar com alguém. A conversa é boa, você gosta dele, e ele também demonstra interesse.",
      "No outro dia, ele some.",
      "Aí você pode pensar: “vou mandar outra mensagem, vou puxar assunto, preciso fazer essa conversa continuar.”",
      "Ou o contrário: “agora não respondo, vou demorar, preciso mostrar que não estou disponível.”",
      "Nos dois casos, você está tentando controlar o que ele vai pensar. Mas existe uma terceira forma.",
      "Nenhum dos dois.",
    ],
    opts: [{ t: "Qual?", to: "terceiravia" }],
  },
  terceiravia: {
    lady: [
      "Você pode gostar dele. Pode responder quando ele falar. Pode demonstrar que gostou da conversa.",
      "Mas não precisa fazer a conversa acontecer sozinha.",
      "Se ele quiser continuar, ele também vai participar. Se não participar, você já tem uma resposta.",
    ],
    opts: [{ t: "Faz sentido", to: "nomeia" }],
  },
  nomeia: {
    lady: [
      "É disso que eu falo quando digo Elegância Prática.",
      "Não é ficar parada esperando. Não é fazer joguinho. E não é correr atrás.",
      "É participar sem carregar tudo sozinha. É saber se colocar sem deixar de ser você.",
    ],
    opts: [{ t: "E onde mais isso aparece?", to: "grandevirada" }],
  },

  // Card 6 — a grande virada
  grandevirada: {
    lady: [
      "E isso não serve só para o começo. A mesma coisa aparece quando você percebe que está gostando, quando precisa colocar um limite, quando sente que a pessoa está se afastando, ou quando precisa decidir se continua.",
      "Porque existe uma pergunta que muda tudo.",
      "Em vez de pensar: “como faço essa pessoa gostar de mim?”",
      "Você começa a pensar: “o que essa pessoa está me mostrando?”",
      "Isso muda a sua posição. Você deixa de ficar apenas esperando para ser escolhida.",
      "Você também começa a escolher.",
    ],
    opts: [{ t: "Quero aprender isso", to: "esperanca" }],
  },
  esperanca: {
    lady: [
      "E quero que você guarde uma coisa. Existem pessoas procurando o mesmo que você.",
      "Pessoas que querem carinho, companhia, parceria, construir uma vida a dois.",
      "Você não precisa aprender a fazer qualquer pessoa gostar de você. Precisa aprender a reconhecer quem combina com o que você procura — e saber como agir quando essa pessoa aparecer.",
    ],
    opts: [{ t: "Quero aprender", to: "transicao" }],
  },
  transicao: {
    lady: [
      "Foi por isso que eu organizei tudo isso em uma jornada.",
      "Uma jornada para você entender o que mostra, como se colocar, como conversar, como mostrar interesse, e como perceber quando o interesse vem dos dois lados.",
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
