import { redirect } from "next/navigation";
import { contexto } from "@/lib/membro";
import { membrosDaFamilia, eventosNaJanela } from "@/lib/agenda";
import AgendaBoard from "@/components/AgendaBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agenda da Casa · Marta" };

export default async function Agenda() {
  const { user, familia } = await contexto();
  if (!user) redirect("/entrar");
  const [membros, eventos] = [membrosDaFamilia(familia), await eventosNaJanela(user.id, 30)];

  return (
    <main className="screen">
      <div className="eyebrow">📅 Agenda da Casa</div>
      <h1 className="h">O que temos <span style={{ color: "var(--clay)" }}>pela frente</span></h1>
      <p className="sub">A agenda da família, com a cor de cada um. Eu seguro isso pra você. 💛</p>
      <AgendaBoard membros={membros} eventosIniciais={eventos} logado={!!user} familia={familia} />
    </main>
  );
}
