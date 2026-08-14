"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — a landing principal: experiência em cards full-screen (VSL-like)
//  com o posicionamento TIPO 4 (Elegância Prática) e a SESSÃO COM A LADY (chat
//  scripted on-rails; IA entra numa fase 2).
//
//  RÉGUA DE COPY: intensidade + curiosidade. Entregar o RESULTADO (desejo),
//  NUNCA o método. Nada de listar os 5 conceitos — isso mata a curiosidade.
//  Mistério ≠ vago: a frase promete um resultado concreto e esconde o "como".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import PreCheckout from "@/components/PreCheckout";

// dispara evento no Pixel da Meta (no-op se o fbq não carregou)
function trackFb(evento, dados, tipo = "track") {
  try { if (typeof window !== "undefined" && window.fbq) window.fbq(tipo, evento, dados); } catch {}
}
const VALOR = 37.9;
const CONTEUDO = "Kit · A Mulher que Ele Procura";

// Rosto oficial da Lady: quando existir, aponte para "/livro/lady.webp".
const LADY_FOTO = "";

const CAMINHOS = [
  ["01", "Esperar", "“Ore, confie e aguarde o tempo certo.”"],
  ["02", "Melhorar-se", "“Aumente a autoestima, cuide da aparência.”"],
  ["03", "Os joguinhos", "“Faça-o correr atrás. Suma. Provoque.”"],
];

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
      "Deixa eu te contar uma coisa. Existem três caminhos que ensinam a mulher sobre amor: esperar em oração, melhorar a autoestima, ou os joguinhos de sedução.",
      "Nenhum deles funcionou pra você por inteiro, né? Existe um quarto — e quase ninguém fala sobre ele.",
    ],
    opts: [{ t: "Qual é o quarto?", to: "tipo4" }],
  },
  tipo4: {
    lady: [
      "Eu chamo de Elegância Prática. Não é esperar, não é fingir, não é manipular. É saber, na prática, o que faz um homem de valor perceber uma mulher — e passar direto por outra.",
      "Por trás disso existe um método. Mas ele não se explica numa conversa: ele se descobre, peça por peça.",
    ],
    opts: [{ t: "E como eu descubro?", to: "fecho" }],
  },
  fecho: {
    lady: [
      "Eu reuni tudo numa obra curta, para você ler no celular em uns 30 minutos.",
      "No meio do caminho existe uma descoberta que muda como o homem certo enxerga você — e eu não consigo te entregar isso aqui. Só lá dentro. Quer que eu te mostre?",
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

const TOTAL = 6;

export default function FunilSwipe({ preco = "R$ 37,90", url = "" }) {
  const [step, setStep] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const avancar = () => setStep((s) => Math.min(TOTAL - 1, s + 1));

  useEffect(() => {
    document.body.classList.add("sw-fs");
    return () => document.body.classList.remove("sw-fs");
  }, []);

  // ViewContent ao entrar no funil (Meta: quem começou a jornada)
  useEffect(() => { trackFb("ViewContent", { content_name: CONTEUDO, content_category: "funil", value: VALOR, currency: "BRL" }); }, []);
  // marca cada card: Pixel (drop-off no Meta) + interno (/api/evento → painel admin)
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

      {step === 0 && (
        <>
          <div className="sw-card" key="c0">
            <div className="sw-eyebrow">Damas Virtuosas</div>
            <h1 className="sw-h">Por que um homem de valor percebe <em>uma</em> mulher — e passa direto por outra?</h1>
            <p className="sw-p">A resposta não é beleza. Não é sorte. E não é esperar. É algo que pouquíssimas mulheres aprenderam a fazer.</p>
          </div>
          <div className="sw-foot">
            <button className="sw-btn" onClick={avancar}>Quero entender</button>
            <span className="sw-hint">leva 2 minutos</span>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="sw-card" key="c1">
            <div className="sw-eyebrow">O que te ensinaram até hoje</div>
            <h2 className="sw-h">Três caminhos — e por que nenhum funcionou</h2>
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
            <p className="sw-q">E se o certo fosse um quarto caminho?</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Existe um quarto?</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="sw-card" key="c2">
            <div className="sw-eyebrow">A lacuna</div>
            <div className="sw-selo4">IV<small>Elegância Prática</small></div>
            <p className="sw-p">Não é esperar parada. Não é virar outra pessoa. Não é manipular ninguém. É aprender a participar da própria história.</p>
            <p className="sw-q">Existe um método que, aplicado, leva você de <em>despercebida</em> a alvo dos homens de valor.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Como assim, um método?</button></div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="sw-card" key="c3">
            <div className="sw-eyebrow">Talvez você já intua</div>
            <h2 className="sw-h">E se não fosse nada do que te disseram?</h2>
            <div className="sw-exemplos">
              <div className="sw-exemplo">Talvez não falte interesse. Falte <b>onde</b> esse interesse poderia te encontrar.</div>
              <div className="sw-exemplo">Talvez você não precise ser irresistível. Só perceber o que a sua presença já <b>diz</b> — sem você notar.</div>
              <div className="sw-exemplo">Talvez não sejam joguinhos. Seja saber <b>demonstrar</b> sem se entregar por inteiro.</div>
            </div>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero conhecer o método</button></div>
        </>
      )}

      {step === 4 && <LadyChat onDone={() => setStep(5)} />}

      {step === 5 && (
        <>
          <div className="sw-card rola" key="c5">
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
              <div className="sw-oferta-d">A jornada completa, no seu celular. No caminho, uma descoberta muda como o homem certo enxerga você — e ela só existe lá dentro.</div>
              <div className="sw-preco">{preco}<small>pagamento único · acesso imediato · vitalício</small></div>
              {url ? (
                <button type="button" className="pill" onClick={abrirCheckout}>Quero descobrir →</button>
              ) : (
                <span className="pill" style={{ opacity: 0.6, display: "inline-block" }}>Em breve</span>
              )}
              <p className="sw-reassure">~30 min de leitura · 7 dias de garantia</p>
            </div>
          </div>
        </>
      )}

      {showCheck && url && <PreCheckout url={url} onClose={() => setShowCheck(false)} />}
    </div>
  );
}
