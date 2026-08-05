import Link from "next/link";

export const metadata = { title: "Marta — a sua ajudante do lar" };

const MODULOS = [
  { href: "/cozinha", ic: "🍳", t: "Cozinha", d: "Cardápio da semana + lista de compras", viva: true },
  { href: "/casa", ic: "🧹", t: "Ordem da Casa", d: "Rotinas e tarefas de cada um", viva: false },
  { href: "/filhos", ic: "🧒", t: "Filhos & Virtudes", d: "Hábitos e recompensas em família", viva: false },
  { href: "/financas", ic: "💰", t: "Finanças do Lar", d: "As contas da casa sob controle", viva: false },
];

export default function Inicio() {
  return (
    <main className="screen">
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="msg">
          Oi, querida! Eu sou a <b>Marta</b> — vim te ajudar a cuidar do seu lar sem virar bagunça na cabeça.
          Vamos começar pela pergunta que aperta todo dia: <b>“o que vou fazer pra comer?”</b>
        </div>
      </div>

      <Link href="/cozinha" className="btn" style={{ textDecoration: "none" }}>🍳 Montar o cardápio da semana</Link>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>O seu lar, por partes</div>
        <div className="grid">
          {MODULOS.map((m) => (
            <Link key={m.href} href={m.viva ? m.href : "#"} className={"mod" + (m.viva ? " on" : "")}
              style={m.viva ? {} : { opacity: 0.75, pointerEvents: "none" }}>
              <div className="ic">{m.ic}</div>
              <div>
                <div className="t">{m.t}</div>
                <div className="d">{m.d}</div>
              </div>
              <span className={"tag" + (m.viva ? " viva" : "")}>{m.viva ? "Disponível" : "Em breve"}</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>
        Feito pra dar <b>menos ruído</b>, não mais tela. ✦
      </p>
    </main>
  );
}
