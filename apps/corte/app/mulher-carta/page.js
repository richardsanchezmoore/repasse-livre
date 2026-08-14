import { criarSupabaseServer } from "@/lib/supabaseServer";
import BotaoCompra from "@/components/BotaoCompra";

// Landing "de respeito" (/mulher) — estrutura clássica de conversão para a obra
// âncora + Kit como bônus. Vende planos.kit (R$ 37,90). Pública, indexável.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Como se Tornar a Mulher que “Ele” Procura · Damas Virtuosas",
  description:
    "O método elegante e prático para ser percebida, lembrada e desejada pelo homem certo — sem joguinhos, sem deixar de ser você.",
};

const MOVIMENTOS = [
  { n: "I", t: "Presença", d: "Onde estar — e como — para deixar de depender do acaso." },
  { n: "II", t: "Expressão", d: "O que a sua presença comunica antes de você dizer uma palavra." },
  { n: "III", t: "Revelação", d: "Como despertar interesse sendo você mesma, sem joguinhos." },
  { n: "IV", t: "Linguagem", d: "Como transformar uma conversa qualquer em conexão de verdade." },
  { n: "V", t: "Ação", d: "Como ler intenções, colocar limites e, enfim, escolher." },
];

const BONUS = [
  ["📕", "O Panfleto Secreto do Altar", "O raio-X dos 12 perfis de pretendentes."],
  ["👑", "O Cavalheiro que Vale o seu Altar", "Como reconhecer o homem preparado para construir."],
  ["🔎", "O Dossiê & o Veredito", "Suas ferramentas de discernimento, sempre à mão."],
  ["📿", "O Diário da Dama", "Para registrar a sua própria temporada."],
];

const FAQ = [
  ["É muita leitura?", "Não. A obra foi feita para o seu celular e se lê em cerca de 30 minutos — com missões práticas para aplicar depois."],
  ["Isso é sedução ou manipulação?", "É o oposto. Nada de joguinhos ou de fingir ser outra pessoa: o método é sobre tornar visíveis as virtudes que um homem maduro procura."],
  ["Sou tímida. Funciona para mim?", "Sim — o método começa exatamente daí. O primeiro movimento é sobre presença, e nenhum passo exige que você se transforme."],
  ["Como eu recebo?", "O acesso é liberado na hora, assim que o pagamento é confirmado, direto no aplicativo das Damas Virtuosas."],
  ["E se não for para mim?", "Você tem 7 dias de garantia. Se não fizer sentido, é só pedir o reembolso — sem burocracia."],
];

function CTA({ url, preco, children }) {
  return (
    <div className="lpm-cta-wrap">
      {url ? (
        <BotaoCompra url={url} className="pill">{children || "Quero começar agora"} · {preco} →</BotaoCompra>
      ) : (
        <span className="pill" style={{ opacity: 0.6 }}>Em breve</span>
      )}
    </div>
  );
}

export default async function LandingMulher() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const kit = cfg?.valor?.kit || {};
  const preco = kit.preco || "R$ 37,90";
  const url = kit.cakto_url || "";

  return (
    <main className="lpm-main">
      <div className="lpm">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <header className="lpm-hero" style={{ backgroundImage: "url(/livro/cena3.webp)" }}>
          <div className="lpm-hero-v">
            <div className="lpm-eyebrow">Damas Virtuosas · A Corte</div>
            <h1 className="lpm-h1">Como se Tornar a Mulher que <em>“Ele”</em> Procura</h1>
            <p className="lpm-sub">
              O método elegante — e surpreendentemente prático — para ser percebida,
              lembrada e desejada pelo homem certo. Sem joguinhos. Sem deixar de ser você.
            </p>
            <CTA url={url} preco={preco}>Quero descobrir o método</CTA>
            <p className="lpm-trust claro" style={{ marginTop: 12 }}>Acesso imediato · leitura de ~30 min · seu para sempre</p>
            <div className="lpm-scroll" aria-hidden>⌄</div>
          </div>
        </header>

        {/* ── A DOR ────────────────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">Talvez você já tenha sentido isso</div>
          <h2 className="lpm-h2">Você faz tudo “certo” — e mesmo assim nada acontece</h2>
          <p className="lpm-lead">
            Você é boa, é paciente, é fiel a quem é. Vê amigas conhecerem alguém, começarem
            histórias, viverem relacionamentos — e você continua esperando. Até que, baixinho,
            aparece a pergunta mais dolorosa: “será que existe algo errado comigo?”.
          </p>
          <p className="lpm-em">Quase sempre, não há. Há apenas coisas que ninguém te ensinou.</p>
        </section>

        {/* ── A VIRADA + MÉTODO ───────────────────────────────────────── */}
        <section className="lpm-sec tint">
          <div className="lpm-kicker">A virada</div>
          <h2 className="lpm-h2">Não é sorte. Não é aparência. É um método.</h2>
          <p className="lpm-lead">
            Existe uma sequência por trás das mulheres que parecem naturalmente percebidas,
            lembradas e desejadas — cinco movimentos que mudam a forma como você é vista e,
            principalmente, a sua capacidade de <strong>escolher</strong>.
          </p>
          <div className="lpm-passos">
            {MOVIMENTOS.map((m) => (
              <div key={m.n} className="lpm-passo">
                <div className="lpm-passo-n">{m.n}</div>
                <div>
                  <div className="lpm-passo-t">{m.t}</div>
                  <div className="lpm-passo-d">{m.d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="lpm-em">Cinco peças que, juntas, formam um método — e um nome.</p>
        </section>

        {/* ── O QUE ESTÁ INCLUÍDO ─────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">O que você leva</div>
          <h2 className="lpm-h2">A obra completa — e muito mais</h2>
          <div className="lpm-stack">
            <div className="lpm-item">
              <span className="ck">🔑</span>
              <div className="lpm-item-t">
                Como se Tornar a Mulher que “Ele” Procura
                <small>A obra completa, em leitura interativa no aplicativo.</small>
              </div>
            </div>
            {BONUS.map(([ic, t, d]) => (
              <div key={t} className="lpm-item bonus">
                <span className="ck">{ic}</span>
                <div className="lpm-item-t">
                  {t} <span className="lpm-tagbonus">bônus</span>
                  <small>{d}</small>
                </div>
              </div>
            ))}
            <div className="lpm-item">
              <span className="ck">♾️</span>
              <div className="lpm-item-t">
                Acesso vitalício
                <small>Tudo no seu celular, para sempre — sem mensalidade.</small>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <CTA url={url} preco={preco}>Quero tudo isso</CTA>
          </div>
        </section>

        {/* ── PARA QUEM É ─────────────────────────────────────────────── */}
        <section className="lpm-sec tint">
          <div className="lpm-kicker">Antes de continuar</div>
          <h2 className="lpm-h2">Isto é para você?</h2>
          <div className="lpm-quem">
            <div className="lpm-quem-col sim">
              <div className="lpm-quem-h">É para você se…</div>
              <ul>
                <li>Deseja um relacionamento com propósito e fé.</li>
                <li>Está cansada de esperar sem saber o que fazer.</li>
                <li>Quer ser escolhida — e aprender a escolher.</li>
                <li>Busca elegância, não joguinhos.</li>
              </ul>
            </div>
            <div className="lpm-quem-col nao">
              <div className="lpm-quem-h">Não é se…</div>
              <ul>
                <li>Procura técnicas de sedução ou manipulação.</li>
                <li>Quer “fisgar qualquer homem” a qualquer custo.</li>
                <li>Espera um relacionamento sem nenhum esforço seu.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── MARCA / ETHOS ───────────────────────────────────────────── */}
        <section className="lpm-sec escura">
          <div className="lpm-kicker">A nossa filosofia</div>
          <p className="lpm-em">
            “Ore como quem confia em Deus, e caminhe como quem sabe que oportunidades
            também fazem parte da resposta.”
          </p>
          <p className="lpm-lead claro">
            É o que chamamos de <strong>Elegância Prática</strong>: fé sem passividade,
            ação sem desespero. Nem esperar em silêncio, nem correr atrás — caminhar com intenção.
          </p>
        </section>

        {/* ── OFERTA / PREÇO ──────────────────────────────────────────── */}
        <section className="lpm-sec creme">
          <div className="lpm-kicker">A sua vez</div>
          <h2 className="lpm-h2">Comece hoje a sua temporada</h2>
          <div className="lpm-precocard">
            <div className="ic">🔑</div>
            <div className="lpm-precocard-t">A obra + o Kit da Temporada completo</div>
            <div className="lpm-preco">{preco}<small>pagamento único · acesso imediato · vitalício</small></div>
            <CTA url={url} preco={preco}>Quero começar agora</CTA>
            <div className="lpm-garantia"><span className="sel">🛡️</span> 7 dias de garantia — ou o seu dinheiro de volta.</div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="lpm-sec tint">
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
            <CTA url={url} preco={preco}>Quero a minha chave</CTA>
          </div>
          <div className="lpm-lady">— A Lady</div>
        </section>
      </div>
    </main>
  );
}
