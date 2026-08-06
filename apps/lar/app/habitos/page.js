import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { carregarHabitos } from "@/lib/habitos";
import HabitosBoard from "@/components/HabitosBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus Hábitos · Marta" };

export default async function Habitos() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) redirect("/entrar");
  const habitos = await carregarHabitos(auth.user.id);
  return (
    <main className="screen">
      <div className="eyebrow">🌷 Meus Hábitos</div>
      <h1 className="h">Um cuidado <span style={{ color: "var(--clay)" }}>com você</span></h1>
      <p className="sub">Pequenos hábitos que sustentam a mulher que sustenta a casa. 💛</p>
      <HabitosBoard iniciais={habitos} />
    </main>
  );
}
