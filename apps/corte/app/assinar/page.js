import { criarSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "A Corte · assinatura",
  description: "O refúgio de discernimento, fé e comunidade — na Temporada de Pretendentes.",
};

const BENEFICIOS = [
  { ic: "🗂️", t: "Dossiês ilimitados", d: "Investigue cada pretendente e receba o Veredito da Lady — quantos quiser." },
  { ic: "🕯️", t: "Jornada semanal", d: "Um devocional novo toda semana, guiando o seu discernimento diante de Deus." },
  { ic: "🍵", t: "O Salão das damas", d: "A comunidade de mulheres que escolheram esperar com sabedoria, não com pressa." },
  { ic: "🛡️", t: "Ferramentas de discernimento", d: "O raio-X dos 12 perfis, sempre à mão, aplicado à sua vida real." },
];

export default async function Assinar() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const a = cfg?.valor?.assinatura || {};
  const preco = a.preco || "R$ 19,90/mês";
  const trial = a.trial_dias;
  const url = a.cakto_url || "";

  return (
    <main className="lp">
      <div className="lp-hero">
        <div className="eyebrow">◈ A Corte · assinatura ◈</div>
        <h1 className="lp-title">O seu <em>refúgio</em> de discernimento</h1>
        <p className="lp-sub">Enquanto o mundo manda você caçar, a Corte te ensina a <strong>ler os sinais</strong> — com fé, elegância e uma pitada de veneno bíblico.</p>
        {url
          ? <a href={url} className="pill lp-cta" target="_blank" rel="noopener noreferrer">{trial ? `Começar ${trial} dias grátis` : "Assinar agora"} · {preco} →</a>
          : <span className="pill lp-cta" style={{ opacity: 0.6 }}>Em breve</span>}
        <p className="lp-mini">{trial ? `${trial} dias grátis, depois ${preco}. Cancele quando quiser.` : `${preco}. Cancele quando quiser.`}</p>
      </div>

      <section className="lp-benes">
        {BENEFICIOS.map((b) => (
          <div key={b.t} className="lp-bene">
            <span className="lp-bi">{b.ic}</span>
            <div>
              <div className="lp-bt">{b.t}</div>
              <div className="lp-bd">{b.d}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card dark" style={{ margin: "6px 18px" }}>
        <div className="c-k">A promessa</div>
        <div className="c-t">"Sobre tudo o que se deve guardar, <em>guarda o teu coração</em>."</div>
        <div className="c-p">Provérbios 4:23. A Corte é o lugar onde você aprende a fazer isso — semana após semana.</div>
      </section>

      <div className="lp-final">
        {url
          ? <a href={url} className="pill" target="_blank" rel="noopener noreferrer">{trial ? `Começar ${trial} dias grátis` : "Assinar"} · {preco} →</a>
          : <span className="pill" style={{ opacity: 0.6 }}>Em breve</span>}
        <p className="muted">Uma dama sábia não improvisa o coração. — Lady Whistledown do Altar</p>
      </div>
    </main>
  );
}
