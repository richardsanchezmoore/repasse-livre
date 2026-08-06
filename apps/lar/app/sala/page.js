import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoSala, listarRodas } from "@/lib/sala";
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

  const rodas = await listarRodas();
  return (
    <main className="screen">
      <div className="eyebrow">💬 A Sala</div>
      <h1 className="h">Oi, {perfil.apelido} 💛</h1>
      <p className="sub">Escolha uma roda pra conversar com outras mães e esposas.</p>
      {["moderadora", "admin"].includes(perfil.papel) && (
        <Link href="/admin/sala" className="chip" style={{ textDecoration: "none", alignSelf: "flex-start" }}>🛡️ Moderar a Sala</Link>
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
