import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { contexto } from "@/lib/membro";
import { listaComItens } from "@/lib/listas";
import ListaEditor from "@/components/ListaEditor";

export const dynamic = "force-dynamic";

export default async function ListaPage({ params }) {
  const { user, familia } = await contexto();
  if (!user) redirect("/entrar");
  const lista = await listaComItens(user.id, params.id);
  if (!lista) notFound();

  return (
    <main className="screen sala-tela">
      <div className="sala-topo">
        <Link href="/listas" className="sala-voltar" aria-label="voltar">‹</Link>
        <div className="sala-titulo">{lista.tipo === "tarefas" ? "✅" : "🛒"} {lista.titulo}</div>
      </div>
      <div style={{ padding: "14px 12px 0" }}>
        <ListaEditor lista={lista} familia={familia} />
      </div>
    </main>
  );
}
