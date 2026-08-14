"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — a landing principal: experiência em cards full-screen (VSL-like)
//  com o posicionamento TIPO 4 (Elegância Prática) e a SESSÃO COM A LADY (chat
//  scripted on-rails; IA entra numa fase 2). Não vende o livro de cara — vende a
//  descoberta de que ela procurava no lugar errado. NUNCA mostra a sigla PERLA.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import BotaoCompra from "@/components/BotaoCompra";

const CAMINHOS = [
  ["01", "Espere", "Ore, confie e aguarde o tempo certo."],
  ["02", "Melhore-se", "Autoestima, aparência, seja a sua melhor versão."],
  ["03", "Aprenda os jogos", "Técnicas, estratégias, faça-o correr atrás."],
];
const CONCEITOS = ["Presença", "Expressão", "Revelação", "Linguagem", "Ação"];

// ── roteiro do chat da Lady (on-rails; determinístico) ──────────────────────
const CHAT = {
  start: {
    lady: ["Oi, querida. Que bom que você chegou até aqui. 🤍", "Antes de eu te mostrar uma coisa, posso te fazer uma pergunta?"],
    opts: [{ t: "Pode, sim", to: "q1" }],
  },
  q1: {
    lady: ["Quando você pensa na sua vida amorosa hoje, o que mais pesa?"],
    opts: [
      { t: "Sinto que ninguém aparece", to: "r_aparece" },
      { t: "Apareço, mas não sou notada", to: "r_notada" },
      { t: "Começo e não sei manter", to: "r_manter" },
      { t: "Tenho medo de escolher errado", to: "r_escolher" },
    ],
  },
  r_aparece: { lady: ["Eu entendo. E olha… quase nunca é porque falta algo em você. Na maioria das vezes, é só que a sua rotina não está criando encontros novos."], opts: [{ t: "Faz sentido…", to: "ponte" }] },
  r_notada: { lady: ["Sei bem. Muitas vezes a mulher está ali, presente — mas, sem perceber, comunica “não se aproxime”. E dá para mudar isso sem virar outra pessoa."], opts: [{ t: "Faz sentido…", to: "ponte" }] },
  r_manter: { lady: ["Isso é mais comum do que você imagina. Aproximar é uma coisa; transformar em conexão é outra — e é algo que se aprende."], opts: [{ t: "Faz sentido…", to: "ponte" }] },
  r_escolher: { lady: ["Esse cuidado é sinal de sabedoria. A boa notícia é que dá para aprender a observar e a escolher, em vez de só torcer para não errar."], opts: [{ t: "Faz sentido…", to: "ponte" }] },
  ponte: {
    lady: [
      "Deixa eu te contar uma coisa. Existem basicamente três caminhos que ensinam a mulher sobre amor: esperar em oração, melhorar a autoestima, ou os joguinhos de sedução.",
      "Nenhum deles conversa por inteiro com uma mulher de fé que também quer agir.",
    ],
    opts: [{ t: "E existe outro?", to: "tipo4" }],
  },
  tipo4: {
    lady: [
      "Existe. Eu chamo de Elegância Prática: fé sem passividade, presença sem desespero, discernimento sem joguinho.",
      "Por trás disso há um método — mas ele não se explica numa conversa. Ele se descobre, peça por peça.",
    ],
    opts: [{ t: "Como assim, se descobre?", to: "fecho" }],
  },
  fecho: {
    lady: [
      "Eu reuni tudo numa obra curta, para você ler no celular em uns 30 minutos.",
      "No meio do caminho existe uma descoberta que conecta tudo — e que eu não conseguiria te entregar aqui. Quer que eu te mostre?",
    ],
    opts: [{ t: "Sim, quero descobrir ✨", cta: true, to: "__done" }],
  },
};

function LadyChat({ onDone }) {
  const [node, setNode] = useState("start");
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showOpts, setShowOpts] = useState(false);
  const threadRef = useRef(null);

  // toca as falas da Lady da vez, uma a uma, com "digitando…".
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
      const dly = 650 + Math.min(msg.length * 16, 1500);
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setMsgs((m) => [...m, { who: "lady", text: msg }]);
        idx += 1;
        timers.push(setTimeout(step, 320));
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
        <div className="ldy-av">L</div>
        <div>
          <div className="ldy-nome">A Lady</div>
          <div className="ldy-status">● sua mentora da Temporada</div>
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

const TOTAL = 6;

export default function FunilSwipe({ preco = "R$ 37,90", url = "" }) {
  const [step, setStep] = useState(0);
  const avancar = () => setStep((s) => Math.min(TOTAL - 1, s + 1));

  // Imersão total: esconde TopBar/BottomNav enquanto o funil está montado.
  useEffect(() => {
    document.body.classList.add("sw-fs");
    return () => document.body.classList.remove("sw-fs");
  }, []);

  return (
    <div className="sw">
      <div className="sw-prog">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="sw-card" key="c0">
            <div className="sw-eyebrow">Damas Virtuosas</div>
            <h1 className="sw-h">Talvez você esteja procurando respostas no <em>lugar errado</em>.</h1>
            <p className="sw-p">Ninguém te ensinou o que fazer enquanto o homem certo não aparece. Existe um caminho diferente — e leva 2 minutos para você entender.</p>
          </div>
          <div className="sw-foot">
            <button className="sw-btn" onClick={avancar}>Começar</button>
            <span className="sw-hint">toque para começar</span>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="sw-card" key="c1">
            <div className="sw-eyebrow">O que você já conhece</div>
            <h2 className="sw-h">Três caminhos de sempre</h2>
            <div className="sw-caminhos">
              {CAMINHOS.map(([n, t, d]) => (
                <div key={n} className="sw-caminho">
                  <span className="nn">{n}</span>
                  <div>
                    <div className="sw-caminho-t">{t}</div>
                    <div className="sw-caminho-d">{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="sw-q">E se existisse um quarto?</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Existe um quarto caminho?</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="sw-card" key="c2">
            <div className="sw-eyebrow">A lacuna</div>
            <div className="sw-selo4">IV<small>Elegância Prática</small></div>
            <p className="sw-p">Não é esperar parada. Não é virar outra pessoa. Não é manipular ninguém. É aprender a participar da própria história — com fé, presença e discernimento.</p>
            <div className="sw-conceitos">
              {CONCEITOS.map((c) => <span key={c} className="sw-conceito">{c}</span>)}
            </div>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Como isso funciona?</button></div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="sw-card" key="c3">
            <div className="sw-eyebrow">Na vida real</div>
            <h2 className="sw-h">Pequenas mudanças, outro resultado</h2>
            <div className="sw-exemplos">
              <div className="sw-exemplo">Talvez o problema não seja que ninguém se interesse. Talvez você não esteja <b>criando situações</b> onde esse interesse possa aparecer.</div>
              <div className="sw-exemplo">Talvez você não precise aprender a ser <b>irresistível</b>. Talvez precise perceber o que a sua presença já está comunicando.</div>
              <div className="sw-exemplo">Talvez não sejam joguinhos que faltam. Talvez seja <b>demonstrar interesse</b> sem carregar a aproximação inteira sozinha.</div>
            </div>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero entender de verdade</button></div>
        </>
      )}

      {step === 4 && <LadyChat onDone={() => setStep(5)} />}

      {step === 5 && (
        <>
          <div className="sw-card" key="c5">
            <div className="sw-eyebrow">Do outro lado da porta</div>
            <div className="sw-oferta-card">
              <div className="ic">🔑</div>
              <div className="sw-oferta-t">Como se Tornar a Mulher que “Ele” Procura</div>
              <div className="sw-oferta-d">A jornada completa no seu celular, com o Kit da Temporada como bônus. No caminho, uma descoberta conecta tudo — e você só vai encontrá-la lá dentro.</div>
              <div className="sw-preco">{preco}<small>pagamento único · acesso imediato · vitalício</small></div>
              {url ? (
                <BotaoCompra url={url} className="pill">Quero descobrir →</BotaoCompra>
              ) : (
                <span className="pill" style={{ opacity: 0.6, display: "inline-block" }}>Em breve</span>
              )}
              <p className="sw-reassure">~30 min de leitura · 7 dias de garantia</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
