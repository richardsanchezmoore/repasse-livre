import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoSala, buscarMensagens, bloqueadosDe, listarRodas } from "@/lib/sala";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buscar · A Sala" };

const fmt = (t) => new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

export default async function Busca({ searchParams }) {
  const { user, perfil } = await contextoSala();
  if (!user) redirect("/entrar");
  if (!perfil?.aceitou_termo_em) redirect("/sala");

  const q = String(searchParams?.q || "").trim();
  const [bloqueados, rodas] = await Promise.all([bloqueadosDe(user.id), listarRodas()]);
  const rodaMap = Object.fromEntries(rodas.map((r) => [r.id, r]));
  const resultados = q.length >= 2 ? await buscarMensagens(q, bloqueados) : [];

  return (
    <main className="screen sala-tela">
      <div className="sala-topo">
        <Link href="/sala" className="sala-voltar" aria-label="voltar">‹</Link>
        <form style={{ flex: 1, margin: 0 }}>
          <input className="inp" name="q" defaultValue={q} placeholder="Buscar receita, palavra…" autoFocus />
        </form>
      </div>
      <div style={{ padding: "14px 12px", display: "grid", gap: 10 }}>
        {q.length < 2 && <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>Digite pra buscar nas rodas. 🔎</p>}
        {q.length >= 2 && resultados.length === 0 && <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>Nada encontrado pra “{q}”.</p>}
        {resultados.map((m) => {
          const r = rodaMap[m.roda_id];
          return (
            <Link key={m.id} href={`/sala/${r?.slug || ""}`} className="aviso" style={{ textDecoration: "none" }}>
              <span className="aviso-ic">{r?.icone || "💬"}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="aviso-t">{m.texto}</div>
                <div className="aviso-p">{m.anonimo ? "Uma irmã" : (m.autor_apelido || "—")} · {r?.nome}</div>
              </div>
              <span className="opt aviso-q">{fmt(m.criado_em)}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
