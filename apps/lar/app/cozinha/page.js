import CozinhaPlanner from "@/components/CozinhaPlanner";
import { contexto } from "@/lib/membro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cozinha · Marta" };

export default async function Cozinha() {
  const { user, familia } = await contexto();
  return (
    <main className="screen">
      <div className="eyebrow">🍳 Cozinha</div>
      <h1 className="h">O que vamos comer <span style={{ color: "var(--clay)" }}>esta semana?</span></h1>
      <CozinhaPlanner logado={!!user} familia={familia} />
    </main>
  );
}
