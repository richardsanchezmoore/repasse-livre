import Link from "next/link";
import { redirect } from "next/navigation";
import { contexto } from "@/lib/membro";
import { sair } from "@/app/entrar/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marta — a sua ajudante do lar" };

const MODULOS = [
  { href: "/cozinha", ic: "🍳", t: "Cozinha", d: "Cardápio da semana + lista de compras", viva: true },
  { href: "/casa", ic: "🧹", t: "Ordem da Casa", d: "Rotinas e tarefas de cada um", viva: true },
  { href: "/filhos", ic: "🧒", t: "Filhos & Virtudes", d: "Hábitos e recompensas em família", viva: true },
  { href: "/financas", ic: "💰", t: "Finanças do Lar", d: "As contas da casa sob controle", viva: false },
];

export default async function Inicio() {
  const { user, familia } = await contexto();
  if (user && !familia) redirect("/comecar");
  const nome = familia?.nome_mae || user?.user_metadata?.nome || "";

  return (
    <main className="screen">
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="msg">
          {user ? (
            <>Que bom te ver{nome ? `, ${nome}` : ""}! 💛 Vamos cuidar do lar hoje? Pode começar pela pergunta que aperta todo dia: <b>“o que vou fazer pra comer?”</b></>
          ) : (
            <>Oi, querida! Eu sou a <b>Marta</b> — vim te ajudar a cuidar do seu lar sem virar bagunça na cabeça. Vamos começar pela cozinha?</>
          )}
        </div>
      </div>

      <Link href="/cozinha" className="btn" style={{ textDecoration: "none" }}>🍳 Montar o cardápio da semana</Link>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>O seu lar, por partes</div>
        <div className="grid">
          {MODULOS.map((m) => (
            <Link key={m.href} href={m.viva ? m.href : "#"} className={"mod" + (m.viva ? " on" : "")}
              style={m.viva ? {} : { opacity: 0.7, pointerEvents: "none" }}>
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

      <p className="muted" style={{ textAlign: "center", marginTop: 2 }}>Feito pra dar <b>menos ruído</b>, não mais tela. ✦</p>

      {user ? (
        <form action={sair} style={{ textAlign: "center" }}>
          <button type="submit" className="chip" style={{ marginTop: 4 }}>Sair da conta</button>
        </form>
      ) : (
        <Link href="/entrar" className="btn ghost" style={{ textDecoration: "none" }}>Entrar ou criar conta</Link>
      )}
    </main>
  );
}
