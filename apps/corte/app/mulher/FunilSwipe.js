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
  { n: "01", nome: "Presença", desc: "Como ser notada por quem você quer.", img: "/livro/thumb/cena4.webp" },
  { n: "02", nome: "Expressão", desc: "O que você comunica antes de falar.", img: "/livro/thumb/cena2.webp" },
  { n: "03", nome: "Revelação", desc: "Como despertar a curiosidade dele.", img: "/livro/thumb/cena11.webp" },
  { n: "04", nome: "Linguagem", desc: "O que dizer para criar conexão.", img: "/livro/thumb/cena5.webp" },
  { n: "05", nome: "Ação", desc: "Como agir quando o interesse é dos dois.", img: "/livro/thumb/cena10.webp" },
];

// ── roteiro do chat (V6 — Helena; ponte, não aula) ──────────────────────────
const Q2 = "E como estão as coisas hoje?";
const Q2_OPTS = [
  { t: "Não aparece ninguém", to: "r2_ninguem" },
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
    "Eu sou a Helena — mas aqui pode me chamar de Lady.",
    "Me conta: quando você pensa no relacionamento que gostaria de viver, o que mais deseja?",
  ],
};

const CHAT = {
  start: {
    lady: ABERTURA.b,
    opts: [
      { t: "Encontrar alguém que queira algo sério", to: "rec_serio" },
      { t: "Ser amada e valorizada", to: "rec_valor" },
      { t: "Ter alguém para dividir a vida", to: "rec_dividir" },
    ],
  },

  rec_serio: { lady: ["Entendi. ❤️ Você quer alguém que esteja buscando o mesmo que você.", Q2], opts: Q2_OPTS },
  rec_valor: { lady: ["Ah, isso mexe comigo. ❤️ Ser amada e sentir que te valorizam sempre — não só no começo.", Q2], opts: Q2_OPTS },
  rec_dividir: { lady: ["Eu entendo o que você busca. ❤️ Ter alguém para compartilhar a vida muda muita coisa.", Q2], opts: Q2_OPTS },

  // Acolhimento suave (muda só a 1ª linha) → converge direto p/ a observação e o
  // beat de identificação. Sem alavanca "Me conta" (a mulher já contou a dor).
  r2_ninguem: {
    lady: [
      "Eu imagino como isso pesa. Você quer viver algo, mas parece que nada começa.",
      "E foi aí que comecei a investigar o que estava por trás disso.",
      "Observei mulheres muito diferentes — e percebi: quase todas enfrentavam as mesmas dificuldades.",
    ],
    opts: [
      { t: "Parece muito comigo.", to: "tentativas" },
      { t: "Um pouco, sim.", to: "tentativas" },
    ],
  },
  r2_frente: {
    lady: [
      "Isso é frustrante. Começa bem e, de repente, tudo para.",
      "E foi aí que comecei a investigar o que estava por trás disso.",
      "Observei mulheres muito diferentes — e percebi: quase todas enfrentavam as mesmas dificuldades.",
    ],
    opts: [
      { t: "Parece muito comigo.", to: "tentativas" },
      { t: "Um pouco, sim.", to: "tentativas" },
    ],
  },
  r2_machuco: {
    lady: [
      "Essa parte dói. Você entra querendo que dê certo e sai machucada.",
      "E foi aí que comecei a investigar o que estava por trás disso.",
      "Observei mulheres muito diferentes — e percebi: quase todas enfrentavam as mesmas dificuldades.",
    ],
    opts: [
      { t: "Parece muito comigo.", to: "tentativas" },
      { t: "Um pouco, sim.", to: "tentativas" },
    ],
  },

  // INIMIGO COMUM: tira a culpa dela ("não é você") e desqualifica os caminhos
  // que já falharam — reengaja quem já tentou métodos. Tese Tipo 4, sem citar.
  tentativas: {
    lady: [
      "E olha: não é por falta de tentar.",
      "Você provavelmente já ouviu de tudo — ter paciência, se amar primeiro, até se fazer de difícil pra ele correr atrás.",
      "Mas nada disso mudou o que realmente importa.",
    ],
    opts: [{ t: "É verdade...", to: "descoberta" }],
  },

  // Acolhe a identificação → descoberta firme → territórios, num fôlego só
  // (sem a alavanca "Como assim?"). SOBRE O MÉTODO = convicção.
  descoberta: {
    lady: [
      "Foi justamente isso que me levou a estudar comportamento, comunicação e relacionamentos.",
      "E uma coisa ficou clara:",
      "O que desperta um relacionamento começa antes do primeiro contato.",
      "Começa em como você se coloca, no que mostra, no que revela e em como você conversa.",
    ],
    opts: [{ t: "E como eu faço isso?", to: "encerramento" }],
  },
  // Responde DIRETO à pergunta "E como eu faço isso?" (ponte pergunta→produto)
  encerramento: {
    lady: [
      "É exatamente isso que você vai encontrar no mapa.",
      "São 5 passos simples para você saber o que fazer em cada etapa.",
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
  }, [node, variante]);

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

const TOTAL = 5;

export default function FunilSwipe({ preco = "R$ 37,90", url = "", slug = "" }) {
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

      {/* CHAT COM A HELENA */}
      {step === 1 && <LadyChat variante={variante} onDone={() => setStep(2)} />}

      {/* O MAPA — 5 passos + "não são cinco dicas" */}
      {step === 2 && (
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
      {step === 3 && (
        <>
          <div className="sw-card rola" key="c3">
            <div className="sw-eyebrow">A transformação</div>
            <div className="sw-muda-h">O que muda para você</div>
            <ul className="sw-muda">
              <li>Vai entender o que trava seus relacionamentos.</li>
              <li>Vai perceber o que sua presença comunica.</li>
              <li>Vai saber despertar o interesse.</li>
              <li>Vai reconhecer quando o interesse vem dos dois lados.</li>
              <li>Vai começar a escolher — e não só esperar ser escolhida.</li>
            </ul>

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
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Ver a oferta →</button></div>
        </>
      )}

      {/* OFERTA — vende o caminho; formato/garantia perto do checkout (não como título) */}
      {step === 4 && (
        <>
          <div className="sw-card rola" key="c4">
            <div className="sw-oferta-card">
              <div className="ic">🔑</div>
              <div className="sw-oferta-t">Como se Tornar a Mulher que “Ele” Procura</div>
              <div className="sw-oferta-d">O mapa completo para você entender, aplicar e viver uma nova forma de se relacionar.</div>
              <div className="sw-preco">{preco}<small>pagamento único · acesso imediato</small></div>
              <ul className="sw-recebe">
                <li>Os 5 passos, explicados por dentro</li>
                <li>Acesso imediato</li>
                <li>Acesso vitalício</li>
                <li>Garantia de 7 dias</li>
              </ul>
              {url ? (
                <button type="button" className="pill" onClick={abrirCheckout}>Quero o mapa →</button>
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
