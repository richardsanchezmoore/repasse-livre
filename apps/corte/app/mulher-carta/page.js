import { criarSupabaseServer } from "@/lib/supabaseServer";
import BotaoCompra from "@/components/BotaoCompra";

// Landing TRADICIONAL (/mulher-carta) — mesma narrativa do funil da Lady Helena,
// porém em rolagem clássica, SEM o chat (versão B para teste A/B contra /mulher).
// Vende o LIVRO solo (planos.livro; cai no kit enquanto o produto não existir).
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Como se Tornar a Mulher que “Ele” Procura · Damas Virtuosas",
  description:
    "O mapa das mulheres para destravar seus relacionamentos: entenda o que fazer, desperte interesse e reconheça quem realmente combina com você.",
};

// Os 5 passos do MAPA (o PERLA continua sendo a descoberta dentro da obra).
const PASSOS = [
  { n: "01", t: "Presença", d: "Como ser notada por quem você quer." },
  { n: "02", t: "Expressão", d: "O que você comunica antes de falar." },
  { n: "03", t: "Revelação", d: "Como despertar a curiosidade dele." },
  { n: "04", t: "Linguagem", d: "O que dizer para criar conexão." },
  { n: "05", t: "Ação", d: "Como agir quando o interesse é dos dois." },
];

const MUDA = [
  "Vai entender o que trava seus relacionamentos.",
  "Vai perceber o que sua presença comunica.",
  "Vai saber despertar o interesse.",
  "Vai reconhecer quando o interesse vem dos dois lados.",
  "Vai começar a escolher — e não só esperar ser escolhida.",
];

const DEPS = ["dep5", "dep2", "dep4", "dep6", "dep7"];

const FAQ = [
  ["É muita leitura?", "Não. Foi feito para o seu celular e se lê em cerca de 30 minutos."],
  ["Isso é sedução ou manipulação?", "Não. É sobre você entender o que mostra, como agir e como escolher — sendo você mesma."],
  ["Sou tímida. Funciona para mim?", "Sim. O mapa começa exatamente por onde você está. Nenhum passo pede que você vire outra pessoa."],
  ["Como eu recebo?", "O acesso é liberado na hora, assim que o pagamento é confirmado, direto no aplicativo das Damas Virtuosas."],
  ["E se não for para mim?", "Você tem 7 dias de garantia. Se não fizer sentido, é só pedir o reembolso — sem burocracia."],
];

function CTA({ url, preco, children }) {
  return (
    <div className="lpm-cta-wrap">
      {url ? (
        <BotaoCompra url={url} className="pill">{children || "Quero o mapa"} · {preco} →</BotaoCompra>
      ) : (
        <span className="pill" style={{ opacity: 0.6 }}>Em breve</span>
      )}
    </div>
  );
}

export default async function LandingMulherCarta() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const kit = cfg?.valor?.kit || {};
  const livro = cfg?.valor?.livro || {};
  const prod = livro.cakto_url ? livro : kit;
  const preco = prod.preco || "R$ 67,90";
  const precoDe = prod.preco_de || "";
  const url = prod.cakto_url || "";

  return (
    <main className="lpm-main">
      <div className="lpm">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <header className="lpm-hero" style={{ backgroundImage: "url(/livro/cena3.webp)" }}>
          <div className="lpm-hero-v">
            <div className="lpm-eyebrow">Damas Virtuosas · A Corte</div>
            <h1 className="lpm-h1">Como se Tornar a Mulher que <em>“Ele”</em> Procura</h1>
            <p className="lpm-sub">
              O mapa para você entender o que fazer, despertar interesse e
              reconhecer quem realmente combina com você.
            </p>
            <CTA url={url} preco={preco}>Quero descobrir</CTA>
            <p className="lpm-trust claro" style={{ marginTop: 12 }}>Acesso imediato · leitura de ~30 min · seu para sempre</p>
            <div className="lpm-scroll" aria-hidden>⌄</div>
          </div>
        </header>

        {/* ── A DOR ────────────────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">Talvez você já tenha sentido isso</div>
          <h2 className="lpm-h2">Você quer viver algo — e, por algum motivo, não acontece</h2>
          <p className="lpm-lead">
            Você quer alguém para amar, cuidar e dividir a vida. Vê outras mulheres
            começando histórias e você continua esperando. Até aparecer, baixinho,
            a pergunta que dói: “será que existe algo errado comigo?”.
          </p>
          <p className="lpm-em">Quase sempre não há. Há apenas coisas que ninguém te mostrou.</p>
        </section>

        {/* ── A HELENA / A DESCOBERTA ─────────────────────────────────── */}
        <section className="lpm-sec tint">
          <div className="lpm-kicker">Quem escreveu isto</div>
          <h2 className="lpm-h2">Eu observei muitas mulheres diferentes</h2>
          <p className="lpm-lead">
            Sou a Helena. Durante muito tempo observei mulheres de idades, jeitos e
            histórias completamente diferentes. E percebi que algumas dificuldades
            apareciam de novo — nas mesmas situações. Eu queria entender por quê.
          </p>
          <p className="lpm-lead">
            Foi isso que me levou a estudar de verdade comportamento, comunicação e
            relacionamentos. E comecei a perceber uma coisa importante: muitas vezes,
            o que acontece nos relacionamentos começa <strong>antes</strong> do relacionamento.
          </p>
          <p className="lpm-em">Foi por isso que organizei tudo em um mapa.</p>
        </section>

        {/* ── O MAPA ──────────────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">O mapa das mulheres</div>
          <h2 className="lpm-h2">5 passos para destravar seus relacionamentos</h2>
          <div className="lpm-passos">
            {PASSOS.map((m) => (
              <div key={m.n} className="lpm-passo">
                <div className="lpm-passo-n">{m.n}</div>
                <div>
                  <div className="lpm-passo-t">{m.t}</div>
                  <div className="lpm-passo-d">{m.d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="lpm-em">Não são cinco dicas soltas. Existe uma sequência.</p>
        </section>

        {/* ── O QUE MUDA PARA VOCÊ ────────────────────────────────────── */}
        <section className="lpm-sec tint">
          <div className="lpm-kicker">A transformação</div>
          <h2 className="lpm-h2">O que muda para você</h2>
          <ul className="lpm-muda">
            {MUDA.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </section>

        {/* ── ANTES → DEPOIS ──────────────────────────────────────────── */}
        <section className="lpm-sec escura">
          <div className="lpm-kicker">A mudança de perspectiva</div>
          <div className="lpm-trans">
            <div className="lpm-trans-c antes">
              <div className="lpm-trans-l">Antes</div>
              <div className="lpm-trans-t">“Será que ele vai gostar de mim?”</div>
            </div>
            <div className="lpm-trans-seta" aria-hidden>↓</div>
            <div className="lpm-trans-c depois">
              <div className="lpm-trans-l">Depois</div>
              <div className="lpm-trans-t">“Esse homem combina com o que eu quero viver?”</div>
            </div>
          </div>
        </section>

        {/* ── PROVA SOCIAL ────────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">Quem já leu</div>
          <h2 className="lpm-h2">O que estão dizendo</h2>
          <div className="lpm-deps">
            {DEPS.map((d) => (
              <div key={d} className="lpm-depcard">
                <img src={`/panfleto/depoimentos/${d}.jpg`} alt="Depoimento de uma leitora" loading="lazy" />
              </div>
            ))}
          </div>
        </section>

        {/* ── OFERTA / PREÇO ──────────────────────────────────────────── */}
        <section className="lpm-sec tint">
          <div className="lpm-kicker">A sua vez</div>
          <h2 className="lpm-h2">Comece hoje</h2>
          <div className="lpm-precocard">
            <div className="ic">🔑</div>
            <div className="lpm-precocard-t">O Mapa + a Coleção da Corte</div>
            <p className="lpm-precocard-d">A obra completa — “Como se Tornar a Mulher que ‘Ele’ Procura” — e todos os materiais de discernimento da Corte, juntos.</p>
            <div className="lpm-preco">{precoDe ? <span className="lpm-preco-de">de {precoDe}</span> : null}{preco}<small>pagamento único · acesso imediato</small></div>
            <ul className="lpm-recebe">
              <li>O Mapa completo (os 5 passos por dentro)</li>
              <li>A Coleção da Corte inteira (7 materiais)</li>
              <li>Acesso imediato e vitalício</li>
              <li>Garantia de 7 dias</li>
            </ul>
            <CTA url={url} preco={preco}>Quero tudo</CTA>
            <div className="lpm-garantia"><span className="sel">🛡️</span> 7 dias de garantia — ou o seu dinheiro de volta.</div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">Ainda em dúvida?</div>
          <h2 className="lpm-h2">Perguntas que toda dama faz</h2>
          <div className="lpm-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── FECHO ───────────────────────────────────────────────────── */}
        <section className="lpm-sec escura">
          <p className="lpm-em">A guinada começa quando você deixa de apenas esperar.</p>
          <div style={{ marginTop: 8 }}>
            <CTA url={url} preco={preco}>Quero o mapa</CTA>
          </div>
          <div className="lpm-lady">— Helena</div>
        </section>
      </div>
    </main>
  );
}
