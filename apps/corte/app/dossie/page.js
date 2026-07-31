import Link from "next/link";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { nivel } from "@/lib/dossie";

export const metadata = { title: "O Dossiê · A Corte" };
export const dynamic = "force-dynamic";

export default async function DossiePage() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/dossie");

  const sb = await criarSupabaseServer();
  const { data: dossies } = await sb
    .from("corte_dossies")
    .select("id, nome, igreja, emblema, atualizado_em")
    .order("atualizado_em", { ascending: false });

  const ids = (dossies || []).map((d) => d.id);
  let contagem = {};
  if (ids.length) {
    const { data: respostas } = await sb.from("corte_respostas").select("dossie_id").in("dossie_id", ids);
    for (const r of respostas || []) contagem[r.dossie_id] = (contagem[r.dossie_id] || 0) + 1;
  }

  return (
    <main className="screen">
      <div className="eyebrow">◈ Os seus dossiês ◈</div>
      <h1 className="h-title">O <em>Dossiê</em></h1>
      <p className="h-sub">Toda dama sábia investiga antes de entregar o coração. Abra um dossiê e conheça-o de verdade.</p>

      <Link href="/dossie/novo" className="pill" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
        ✒️ Novo pretendente
      </Link>

      {(!dossies || dossies.length === 0) ? (
        <p className="muted" style={{ marginTop: 22 }}>Nenhum pretendente em investigação ainda. Comece pelo primeiro nome que passou pela sua cabeça 👀</p>
      ) : (
        <div className="shelf" style={{ marginTop: 18 }}>
          {dossies.map((d) => {
            const n = nivel(contagem[d.id] || 0);
            return (
              <Link key={d.id} href={`/dossie/${d.id}`} className="row">
                <div className="ri">{d.emblema || "♟"}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="rt">{d.nome}</div>
                  <div className="rd">{d.igreja || "igreja não informada"} · {n.selo}</div>
                  <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${n.pct}%` }} /></div>
                </div>
                <div className="rgo">›</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
