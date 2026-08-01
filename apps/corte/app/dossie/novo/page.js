import Link from "next/link";
import { redirect } from "next/navigation";
import { usuariaAtual } from "@/lib/auth";
import SeletorAvatar from "@/components/SeletorAvatar";
import { criarDossie } from "../actions";

export const metadata = { title: "Novo pretendente · A Corte" };

export default async function NovoDossiePage() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/dossie/novo");

  return (
    <main className="screen">
      <div className="eyebrow">◈ Abrir investigação ◈</div>
      <h1 className="h-title">Novo <em>pretendente</em></h1>
      <p className="h-sub">Só o começo. Os detalhes você descobre — e registra — com o tempo.</p>

      <form action={criarDossie} className="card" style={{ marginTop: 18 }}>
        <label className="fld-l">Escolha um retrato</label>
        <SeletorAvatar />

        <label className="fld-l" style={{ marginTop: 14 }}>Nome dele</label>
        <input className="fld" name="nome" required placeholder="Ex.: Carlos Alberto" autoFocus />

        <label className="fld-l" style={{ marginTop: 14 }}>Igreja que ele frequenta <span className="opt">(opcional)</span></label>
        <input className="fld" name="igreja" placeholder="Ex.: Assembleia de Deus — bairro Belém" />

        <button className="pill" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
          Abrir o dossiê →
        </button>
      </form>
      <Link href="/dossie" className="muted" style={{ display: "block" }}>← voltar aos dossiês</Link>
    </main>
  );
}
