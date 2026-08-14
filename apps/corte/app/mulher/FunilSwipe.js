"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilSwipe — a landing principal: experiência em 6 cards full-screen (VSL-like)
//  com o posicionamento TIPO 4 (Elegância Prática).
//
//  RÉGUA DE COPY: intensidade + curiosidade. Entregar o RESULTADO (desejo),
//  NUNCA o método/os conceitos. Mistério ≠ vago.
//  Instrumentação: ViewContent (entrada) · FunilPasso + /api/evento (drop-off por
//  card) · InitiateCheckout (abre o pop-box). Purchase por CAPI no webhook Cakto.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import PreCheckout from "@/components/PreCheckout";

// dispara evento no Pixel da Meta (no-op se o fbq não carregou)
function trackFb(evento, dados, tipo = "track") {
  try { if (typeof window !== "undefined" && window.fbq) window.fbq(tipo, evento, dados); } catch {}
}
const VALOR = 37.9;
const CONTEUDO = "Kit · A Mulher que Ele Procura";

const CAMINHOS = [
  ["01", "Esperar", "“Uma hora alguém aparece.”"],
  ["02", "Melhorar", "“Cuide de você. Aumente a autoestima. Fique mais bonita.”"],
  ["03", "Fazer joguinho", "“Não demonstre demais. Deixe ele correr atrás.”"],
];

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

      {/* CARD 1 — o gancho */}
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
            <span className="sw-hint">leva cerca de 2 minutos</span>
          </div>
        </>
      )}

      {/* CARD 2 — os 3 caminhos + a 4ª maneira */}
      {step === 1 && (
        <>
          <div className="sw-card rola" key="c1">
            <div className="sw-eyebrow">O que te ensinaram</div>
            <h2 className="sw-h">Talvez você já tenha tentado de tudo</h2>
            <p className="sw-p">Ou pelo menos aquilo que ensinaram você a fazer.</p>
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
            <p className="sw-p">Só que tem um problema: <b>nada disso explica por que algumas mulheres são percebidas de um jeito tão diferente.</b></p>
            <p className="sw-q">Existe uma quarta maneira de olhar para tudo isso.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero saber qual</button></div>
        </>
      )}

      {/* CARD 3 — o que você transmite sem perceber */}
      {step === 2 && (
        <>
          <div className="sw-card rola" key="c2">
            <div className="sw-eyebrow">A verdade incômoda</div>
            <h2 className="sw-h">Talvez não esteja faltando nada em você</h2>
            <p className="sw-p">Você pode se cuidar, ter autoestima, ser bonita, ser uma mulher interessante. <b>E ainda assim</b> sentir que os homens que você gostaria não chegam — ou chegam, mas a história nunca vai para onde você queria.</p>
            <p className="sw-p">Isso acontece porque existe uma coisa que quase ninguém ensina uma mulher a observar:</p>
            <p className="sw-q">o que ela transmite sem perceber.</p>
            <p className="sw-p">O jeito que você fala. O jeito que responde. O que demonstra. O que aceita. O que faz quando realmente gosta de alguém. <b>Tudo isso fala</b> — mesmo quando você não diz uma palavra.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero entender isso</button></div>
        </>
      )}

      {/* CARD 4 — a diferença: Elegância Prática */}
      {step === 3 && (
        <>
          <div className="sw-card rola" key="c3">
            <div className="sw-eyebrow">A quarta maneira</div>
            <h2 className="sw-h">Agora deixa eu te mostrar onde está a diferença</h2>
            <p className="sw-p">Não é sobre fingir. Não é sobre manipular. E muito menos sobre fazer alguém correr atrás de você.</p>
            <p className="sw-p"><b>É sobre aprender a se posicionar de um jeito diferente:</b> saber o que mostrar, o que falar, quando avançar, quando parar. E fazer tudo isso sem deixar de ser você.</p>
            <div className="sw-selo4">IV<small>Elegância Prática</small></div>
            <p className="sw-p">É quando você aprende a participar da sua própria história — em vez de ficar apenas esperando para ver o que acontece.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Como isso funciona?</button></div>
        </>
      )}

      {/* CARD 5 — a ponte */}
      {step === 4 && (
        <>
          <div className="sw-card rola" key="c4">
            <div className="sw-eyebrow">O que eu mais quero que você entenda</div>
            <h2 className="sw-h">Você não precisa fazer um homem gostar de você</h2>
            <p className="sw-p"><b>Você precisa aprender a perceber melhor quem combina com você — e a mostrar quem você é para que a conexão certa possa acontecer.</b></p>
            <p className="sw-p">Porque sim: existem homens que querem um relacionamento sério. Homens que também estão cansados de relações rasas. O problema é que você pode passar por essas pessoas sem que uma conexão realmente aconteça.</p>
            <p className="sw-p">E muitas vezes não é porque você não é interessante.</p>
            <p className="sw-q">É porque ninguém ensinou você a olhar para essa parte da dinâmica.</p>
            <p className="sw-p">Foi por isso que eu criei essa jornada.</p>
          </div>
          <div className="sw-foot"><button className="sw-btn" onClick={avancar}>Quero conhecer</button></div>
        </>
      )}

      {/* CARD 6 — a oferta */}
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

      {showCheck && url && <PreCheckout url={url} onClose={() => setShowCheck(false)} />}
    </div>
  );
}
