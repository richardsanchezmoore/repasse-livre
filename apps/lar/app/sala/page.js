import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoSala, listarRodas, contarAvisos, destaquesRecentes } from "@/lib/sala";
import SalaEntrada from "@/components/SalaEntrada";

export const dynamic = "force-dynamic";
export const metadata = { title: "A Sala · Marta" };

export default async function Sala() {
  const { user, perfil } = await contextoSala();
  if (!user) redirect("/entrar");

  if (!perfil?.aceitou_termo_em) {
    return (
      <main className="screen">
        <div className="eyebrow">💬 A Sala</div>
        <h1 className="h">A nossa <span style={{ color: "var(--clay)" }}>irmandade</span></h1>
        <SalaEntrada />
      </main>
    );
  }

  const [rodas, avisos, destaques] = await Promise.all([listarRodas(), contarAvisos(user.id), destaquesRecentes(5)]);
  return (
    <main className="screen">
      <div className="eyebrow">💬 A Sala</div>
      <h1 className="h">Oi, {perfil.apelido} 💛</h1>
      <p className="sub">Escolha uma roda pra conversar com outras mães e esposas.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/sala/busca" className="chip" style={{ textDecoration: "none" }}>🔎 Buscar</Link>
        <Link href="/sala/avisos" className="chip" style={{ textDecoration: "none" }}>
          🔔 Avisos{avisos > 0 ? <span className="aviso-badge">{avisos}</span> : ""}
        </Link>
        {["moderadora", "admin"].includes(perfil.papel) && (
          <Link href="/admin/sala" className="chip" style={{ textDecoration: "none" }}>🛡️ Moderar</Link>
        )}
      </div>

      {destaques.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>⭐ Destaques da Marta</div>
          <div className="destaques">
            {destaques.map((d) => (
              <div key={d.id} className="destaque-card">
                <div className="destaque-txt">{d.texto ? `“${d.texto.slice(0, 120)}”` : "📷 foto"}</div>
                <div className="opt" style={{ fontSize: 11.5 }}>— {d.anonimo ? "Uma irmã" : (d.autor_apelido || "irmã")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        {rodas.map((r) => (
          <Link key={r.id} href={`/sala/${r.slug}`} className="mod on" style={{ textDecoration: "none" }}>
            <div className="ic">{r.icone}</div>
            <div>
              <div className="t">{r.nome}</div>
              <div className="d">{r.descricao}</div>
            </div>
            <span className="hoje-go" style={{ marginLeft: "auto" }}>›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
