import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoSala, listarAvisos } from "@/lib/sala";
import MarcarLidos from "@/components/MarcarLidos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avisos · A Sala" };

const fmt = (t) => new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Avisos() {
  const { user, perfil } = await contextoSala();
  if (!user) redirect("/entrar");
  if (!perfil?.aceitou_termo_em) redirect("/sala");
  const avisos = await listarAvisos(user.id);

  return (
    <main className="screen sala-tela">
      <div className="sala-topo">
        <Link href="/sala" className="sala-voltar" aria-label="voltar">‹</Link>
        <div className="sala-titulo">🔔 Avisos</div>
      </div>
      <div style={{ padding: "14px 12px", display: "grid", gap: 10 }}>
        {avisos.length === 0 && <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>Nenhum aviso ainda. Participe das rodas 💛</p>}
        {avisos.map((a) => (
          <Link key={a.id} href={`/sala/${a.roda_slug || ""}`} className={"aviso" + (a.lida ? "" : " novo")} style={{ textDecoration: "none" }}>
            <span className="aviso-ic">{a.tipo === "reacao" ? "💛" : "↩︎"}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="aviso-t"><b>{a.origem_apelido || "Uma irmã"}</b> {a.tipo === "reacao" ? "reagiu à sua mensagem" : "respondeu você"}</div>
              {a.preview && <div className="aviso-p">“{a.preview}”</div>}
            </div>
            <span className="opt aviso-q">{fmt(a.criado_em)}</span>
          </Link>
        ))}
      </div>
      <MarcarLidos />
    </main>
  );
}
