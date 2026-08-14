"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — a landing principal. Estrutura enxuta: GANCHO → CONVERSA COM A
//  LADY (chat scripted, o corpo do funil) → OFERTA.
//
//  O chat é uma "escadinha": pergunta → reconhecimento → pequena tensão →
//  resposta → nova pergunta. ~4 interações reais e a Lady assume a condução.
//  O Tipo 4 (Elegância Prática) NASCE da conversa — não é apresentado como card.
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

// ── roteiro do chat (escadinha; on-rails) ───────────────────────────────────
const Q2 = "Deixa eu te perguntar outra coisa: quando você conhece alguém de quem realmente gosta, você costuma…";
const Q2_OPTS = [
  { t: "Demonstrar logo que gostei", to: "quebra" },
  { t: "Ficar com medo de demonstrar demais", to: "quebra" },
  { t: "Esperar ele tomar a iniciativa", to: "quebra" },
  { t: "Nunca sei o que fazer 😂", to: "quebra" },
];

const CHAT = {
  // 1 — identificação emocional
  start: {
    lady: [
      "Oi, querida. Que bom que você chegou. ❤️",
      "Antes de eu te mostrar uma coisa, quero te fazer uma pergunta.",
      "Quando você pensa na sua vida amorosa hoje, o que mais te incomoda?",
    ],
    opts: [
      { t: "Ninguém aparece", to: "rec_a" },
      { t: "Só encontro quem não quer nada sério", to: "rec_b" },
      { t: "Quando eu gosto, parece que faço demais", to: "rec_c" },
      { t: "É tudo isso 😅", to: "rec_d" },
    ],
  },
  // 2 — reconhecimento (coerente com a resposta) → mesma segunda pergunta
  rec_a: { lady: ["Eu entendo. E sabe o que é curioso? Muitas mulheres acham que o problema é simplesmente “não estar conhecendo ninguém”.", "Mas nem sempre é isso. Às vezes a questão está no que acontece quando alguém aparece.", Q2], opts: Q2_OPTS },
  rec_b: { lady: ["Eu te entendo — e isso cansa. Só que nem sempre é só sobre os homens que aparecem.", "Muita coisa se decide no que fica visível (e no que não fica) já nos primeiros momentos. Isso muda quem se aproxima… e como.", Q2], opts: Q2_OPTS },
  rec_c: { lady: ["Que bom que você percebe isso — muita gente nem repara. E olha: gostar nunca é o problema.", "O problema começa quando a gente entrega o controle da situação sem perceber. E isso tem conserto, mais simples do que parece.", Q2], opts: Q2_OPTS },
  rec_d: { lady: ["Haha, respira. 🤍 Se você marcou essa, eu já gosto de você — é honesta.", "E a boa notícia: esses três parecem problemas diferentes, mas têm a mesma raiz. Quando você entende a raiz, eles começam a mudar juntos.", Q2], opts: Q2_OPTS },
  // 3 — quebra de crença (a Lady ensina)
  quebra: {
    lady: [
      "Olha… presta atenção nisso, porque aqui começa a ficar interessante.",
      "Você provavelmente já ouviu que precisa esperar o homem certo, melhorar a autoestima, ou aprender uns joguinhos pra fazer ele correr atrás.",
      "Só que tem um problema: nada disso explica uma pergunta muito mais importante — por que algumas mulheres são percebidas de uma maneira diferente?",
    ],
    opts: [{ t: "Como assim?", to: "quarto" }],
  },
  // 4 — o quarto caminho / Elegância Prática nasce aqui
  quarto: {
    lady: [
      "É exatamente isso que eu quero te mostrar. Não é sobre ser mais bonita. Nem sobre fazer um homem correr atrás. E muito menos sobre fingir desinteresse.",
      "É sobre uma coisa que acontece antes de tudo isso: o que você transmite. O jeito que fala, o que demonstra, o que aceita, como reage quando gosta, como se posiciona. Tudo isso comunica algo — mesmo quando você não percebe.",
      "Foi observando isso que eu comecei a chamar esse jeito diferente de se relacionar de uma coisa simples: Elegância Prática. Não é virar outra mulher — é aprender a conduzir melhor aquilo que você já é.",
    ],
    opts: [{ t: "Quero entender melhor", to: "exemplo" }],
  },
  // 5 — mostra que é aplicável (microexemplo)
  exemplo: {
    lady: [
      "Vou te dar um exemplo. Imagine que você conheceu um homem e gostou dele.",
      "Uma mulher pensa: “preciso mostrar logo que gostei, pra ele não perder o interesse.” Outra pensa: “preciso fingir que não estou nem aí, pra ele correr atrás.”",
      "E existe uma terceira maneira: demonstrar interesse sem entregar o controle. Ser receptiva sem se colocar à disposição. Mostrar que gostou sem fazer todo o trabalho da relação sozinha. Percebe a diferença?",
    ],
    opts: [{ t: "Agora entendi", to: "transicao" }],
  },
  // 6 — transição para o produto
  transicao: {
    lady: [
      "E isso foi só um exemplo. Porque essa mesma lógica aparece em como você conversa, coloca limites, reage quando alguém se afasta e até escolhe quem merece continuar perto de você.",
      "Foi por isso que eu organizei tudo numa jornada — pra você não precisar descobrir sozinha, na tentativa e erro.",
      "Chama “Como se Tornar a Mulher que Ele Procura”. Eu coloquei ali o caminho completo — e você pode começar agora. 🤍",
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
      const dly = 600 + Math.min(msg.length * 15, 1600);
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
              <div className="sw-oferta-d">Uma jornada prática para entender o que você transmite, como se comunica, como se posiciona — e como suas atitudes mudam a forma como uma relação começa e se desenvolve. Sem joguinhos, sem virar outra pessoa, sem ficar esperando.</div>
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
