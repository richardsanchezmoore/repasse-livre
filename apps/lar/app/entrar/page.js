import { redirect } from "next/navigation";
import { contexto } from "@/lib/membro";
import EntrarForm from "./EntrarForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar · Marta" };

export default async function Entrar() {
  const { user } = await contexto();
  if (user) redirect("/");
  return (
    <main className="screen">
      <div className="marta-hi" style={{ marginTop: 8 }}>
        <div className="av">M</div>
        <div className="msg">Crie a sua conta pra eu <b>guardar o cardápio</b>, lembrar da sua família e cuidar do lar com você toda semana. 💛</div>
      </div>
      <EntrarForm />
    </main>
  );
}
