import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { minhasListas, meusLembretes } from "@/lib/listas";
import LembretesBox from "@/components/LembretesBox";
import ListasBoard from "@/components/ListasBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Listas & Lembretes · Marta" };

export default async function Listas() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) redirect("/entrar");
  const [listas, lembretes] = await Promise.all([minhasListas(auth.user.id), meusLembretes(auth.user.id)]);

  return (
    <main className="screen">
      <div className="eyebrow">📝 Listas & Lembretes</div>
      <h1 className="h">O que <span style={{ color: "var(--clay)" }}>não pode faltar</span></h1>
      <p className="sub">Listas que a família marca junto pelo link — e os lembretes do dia. 💛</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <LembretesBox iniciais={lembretes} />
        <ListasBoard listas={listas} />
      </div>
    </main>
  );
}
