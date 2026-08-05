import Link from "next/link";

export const metadata = {
  title: "Marta — a ajudante do lar que pensa por você",
  description: "Uma assistente de IA que organiza a sua casa, as refeições, a rotina dos filhos e as contas — com carinho, praticidade e valores cristãos.",
};

const ENTRAR = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/entrar";

const FAZ = [
  { ic: "🍳", t: "Planeja a semana", d: "Você diz o que tem em casa; ela monta o cardápio e a lista de compras por corredor." },
  { ic: "🧹", t: "Organiza a casa", d: "Uma faxina rotativa (um foco por dia) e as tarefas divididas — você não faz tudo sozinha." },
  { ic: "🧒", t: "Forma os filhos", d: "Virtudes e hábitos por idade, com um placar que vira passeio em família." },
  { ic: "💰", t: "Cuida das contas", d: "As finanças do lar no lugar, com paz — e a palavra certa na hora certa." },
];

const DIFERENTE = [
  { ic: "🔕", t: "Menos ruído, não mais tela", d: "Ela resolve e sai da frente. As recompensas dos filhos são experiências, não horas de celular." },
  { ic: "🗣️", t: "Ela fala com você", d: "De mãos na massa? A Marta lê o cardápio e a rotina em voz alta enquanto você cozinha." },
  { ic: "✝️", t: "Os seus valores", d: "Uma conselheira que entende a sua fé e a sua família — não um app frio e genérico." },
];

export default function Acesso() {
  return (
    <main className="screen">
      <div className="eyebrow">✦ Damas Virtuosas · Lar &amp; Família</div>
      <h1 className="h">Você não precisa dar conta de <span style={{ color: "var(--clay)" }}>tudo sozinha.</span></h1>
      <p className="sub">Conheça a <b>Marta</b> — uma assistente que pensa a sua casa por você: refeições, ordem, filhos e contas. Com praticidade e os seus valores.</p>
      <Link href={ENTRAR} className="btn" style={{ textDecoration: "none" }}>Começar grátis — 7 dias →</Link>

      <div className="marta-hi" style={{ marginTop: 6 }}>
        <div className="av">M</div>
        <div className="msg">“Eu sei o peso que é segurar uma casa. A lista do mercado, a bagunça que volta, a briga da tela, o fim do mês. Deixa que a partir de hoje a gente carrega isso <b>juntas</b>.” <br /><span className="muted">— Marta</span></div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>A carga invisível de todo dia</div>
        <div className="card">
          {["“O que eu faço pra comer hoje?”", "“Essa casa nunca fica em ordem…”", "“Como ensino meu filho a obedecer?”", "“Cadê o dinheiro que a gente ganhou?”"].map((q, i) => (
            <p key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0, color: "var(--ink-soft)" }}>{q}</p>
          ))}
          <p style={{ marginTop: 10, fontWeight: 600 }}>A Marta responde cada uma delas — <span style={{ color: "var(--clay)" }}>por você</span>.</p>
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>O que a Marta faz</div>
        <div className="grid">
          {FAZ.map((m) => (
            <div key={m.t} className="mod on" style={{ cursor: "default" }}>
              <div className="ic">{m.ic}</div>
              <div><div className="t">{m.t}</div><div className="d">{m.d}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Por que é diferente de tudo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DIFERENTE.map((d) => (
            <div key={d.t} className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 26, flex: "none" }}>{d.ic}</div>
              <div><div className="t" style={{ fontWeight: 700 }}>{d.t}</div><div className="d" style={{ color: "var(--ink-soft)", fontSize: 14 }}>{d.d}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* PREÇO — placeholder, ajustar quando definir a oferta/gateway */}
      <div className="card" style={{ textAlign: "center", borderColor: "var(--clay)" }}>
        <div className="eyebrow">A sua ajudante do lar</div>
        <div style={{ font: "800 40px var(--ui)", color: "var(--clay)", margin: "6px 0 0" }}>R$ 24<span style={{ fontSize: 22 }}>,90</span><span className="muted" style={{ fontSize: 15, fontWeight: 600 }}>/mês</span></div>
        <p className="muted" style={{ marginBottom: 4 }}>ou R$ 199/ano · comece com <b>7 dias grátis</b></p>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>Menos que uma pizza no mês — pela casa inteira mais leve.</p>
        <Link href={ENTRAR} className="btn" style={{ textDecoration: "none" }}>Quero começar grátis →</Link>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Sem fidelidade. Cancele quando quiser.</p>
      </div>

      <p className="muted" style={{ textAlign: "center", padding: "6px 12px 0" }}>
        “A mulher sábia edifica a sua casa.” — a Marta veio pra edificar com você. 💛
      </p>
    </main>
  );
}
