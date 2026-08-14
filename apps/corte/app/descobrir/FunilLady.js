"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  FunilLady — a experiência-funil "PERLA antes do PERLA" (/descobrir).
//
//  Não é uma landing de vendas: é uma CONTINUAÇÃO da conversa com A Lady.
//  ANÚNCIO → LADY → gancho → micro-diagnóstico (identificação) → PORTA DO
//  SEGREDO (existe uma sequência/lógica/método — mas o significado é pago) →
//  OFERTA que não parece oferta. Mesma engenharia da obra: não entregar tudo
//  de uma vez. Reusa os componentes visuais .perla (continuidade com o livro).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import BotaoCompra from "@/components/BotaoCompra";

const PERGUNTAS = [
  "Você anda conhecendo poucos homens novos.",
  "Costuma esperar que a outra pessoa tome a iniciativa.",
  "Já gostou de alguém e não soube como demonstrar.",
  "Já conversou com alguém e, depois, não soube manter a conexão.",
  "Já se perguntou por que algumas mulheres parecem ser percebidas com tanta naturalidade.",
];

function Reflexo({ n }) {
  if (n === 0)
    return (
      <p>
        Se você não se reconheceu em nenhuma delas, talvez já intua parte do que
        vou te contar. Ainda assim, <em>vale atravessar a porta.</em>
      </p>
    );
  if (n <= 2)
    return (
      <p>
        Você se reconheceu em alguns pontos. O que talvez não perceba é que eles
        têm a <em>mesma raiz</em> — e, por isso, uma mesma solução.
      </p>
    );
  return (
    <p>
      Você se reconheceu em vários. Então respire: isso não é um defeito seu. É
      uma <em>lógica que ninguém te ensinou</em> — e que dá, sim, para aprender.
    </p>
  );
}

export default function FunilLady({ preco = "R$ 37,90", url = "" }) {
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [revelou, setRevelou] = useState(false);

  function alterna(i) {
    setMarcadas((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="funil">
      {/* ── A LADY (hero) ─────────────────────────────────────────────────── */}
      <header className="perla-chave" style={{ backgroundImage: "url(/livro/cena1.webp)", minHeight: "80dvh" }}>
        <div className="perla-chave-v">
          <div className="perla-eyebrow" style={{ marginBottom: 14, display: "block" }}>Damas Virtuosas</div>
          <p className="perla-q" style={{ marginTop: 0 }}>A Lady tem uma coisa para te mostrar.</p>
          <p className="perla-p" style={{ maxWidth: "32ch", margin: "0 auto" }}>
            Leva alguns minutos — e talvez mude a pergunta que você anda se fazendo.
          </p>
          <div className="perla-scroll" aria-hidden>⌄</div>
        </div>
      </header>

      {/* ── O GANCHO ──────────────────────────────────────────────────────── */}
      <section className="perla-carta">
        <p className="perla-p">
          Talvez você tenha passado anos acreditando que precisava ser mais bonita,
          mais magra, mais extrovertida — ou simplesmente esperar, com paciência,
          que o homem certo aparecesse por conta própria.
        </p>
        <p className="perla-q">Mas e se o problema nunca tivesse sido esse?</p>
        <p className="perla-p">
          Existem mulheres que parecem ser percebidas, lembradas e desejadas com uma
          naturalidade que, de longe, se confunde com sorte. Não é sorte. É outra
          coisa — e essa coisa, ao contrário do que dizem por aí, se aprende.
        </p>
      </section>

      {/* ── MICRO-DIAGNÓSTICO ─────────────────────────────────────────────── */}
      <section className="funil-diag">
        <h2 className="funil-diag-h">Antes de continuar, seja sincera</h2>
        <p className="funil-diag-sub">Toque no que for verdade para você. Ninguém está vendo — só você.</p>
        <div className="funil-chips">
          {PERGUNTAS.map((p, i) => {
            const on = marcadas.has(i);
            return (
              <button key={i} type="button" className={"funil-chip" + (on ? " on" : "")} onClick={() => alterna(i)} aria-pressed={on}>
                <span className="mk" aria-hidden>✓</span>
                {p}
              </button>
            );
          })}
        </div>

        <button type="button" className="funil-diag-cta" onClick={() => setRevelou(true)} disabled={revelou}>
          {revelou ? "" : "O que isso quer dizer? →"}
        </button>
        <div className={"funil-reflexo" + (revelou ? " on" : "")} aria-live="polite">
          <Reflexo n={marcadas.size} />
        </div>
      </section>

      {/* ── A PORTA DO SEGREDO ────────────────────────────────────────────── */}
      <section className="funil-porta">
        <p className="funil-porta-p">
          Tudo aquilo que você reconheceu tem, por baixo, um mesmo desenho. Não são
          casos isolados de azar. Há uma ordem nisso.
        </p>
        <p className="perla-q">Existe uma sequência. Existe uma lógica. Existe um método.</p>
        <p className="funil-porta-p">
          Cinco peças, descobertas uma de cada vez. Você chegou até a porta — e é
          justamente aqui que eu preciso parar.
        </p>
        <div className="funil-teaser" aria-label="Cinco peças por descobrir">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="oc">?</span>
          ))}
        </div>
        <p className="funil-porta-nota">
          Porque o que essas letras significam — e o que elas formam quando se
          juntam — é a própria descoberta. E a descoberta mora dentro da obra.
        </p>
      </section>

      {/* ── A OFERTA (que não parece oferta) ──────────────────────────────── */}
      <section className="funil-oferta">
        <div className="funil-oferta-eyebrow">Do outro lado da porta</div>
        <p className="funil-oferta-p">
          Nas próximas páginas, você descobre — uma peça de cada vez — o método que
          conecta tudo o que acabou de reconhecer em você.
        </p>
        <div className="funil-card">
          <div className="funil-card-ic">🔑</div>
          <div className="funil-card-t">Como se Tornar a Mulher que “Ele” Procura</div>
          <div className="funil-card-d">
            A obra completa, para ler no seu celular. E, junto, o Kit da Temporada
            inteiro como bônus — acesso vitalício.
          </div>
          <div className="funil-preco">
            {preco}
            <small>pagamento único · seu para sempre</small>
          </div>
          {url ? (
            <BotaoCompra url={url} className="pill">Quero descobrir →</BotaoCompra>
          ) : (
            <span className="pill" style={{ opacity: 0.6, display: "inline-block" }}>Em breve</span>
          )}
          <p className="funil-reassure">Leitura de ~30 minutos · liberado na hora no aplicativo</p>
        </div>
        <div className="funil-oferta-lady">— A Lady</div>
      </section>
    </div>
  );
}
