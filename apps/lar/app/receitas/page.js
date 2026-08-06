import { redirect } from "next/navigation";
import { contexto } from "@/lib/membro";
import { minhasReceitas } from "@/lib/receitas";
import ReceitasBoard from "@/components/ReceitasBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Caderno de Receitas · Marta" };

export default async function Receitas() {
  const { user, familia } = await contexto();
  if (!user) redirect("/entrar");
  const receitas = await minhasReceitas(user.id);
  return (
    <main className="screen">
      <div className="eyebrow">📒 Caderno de Receitas</div>
      <h1 className="h">As receitas da <span style={{ color: "var(--clay)" }}>família</span></h1>
      <p className="sub">Guarde as suas favoritas — e passe adiante num toque. 💛</p>
      <ReceitasBoard iniciais={receitas} familia={familia} logado={!!user} />
    </main>
  );
}
