import CozinhaPlanner from "@/components/CozinhaPlanner";

export const metadata = { title: "Cozinha · Marta" };

export default function Cozinha() {
  return (
    <main className="screen">
      <div className="eyebrow">🍳 Cozinha</div>
      <h1 className="h">O que vamos comer <span style={{ color: "var(--clay)" }}>esta semana?</span></h1>
      <CozinhaPlanner />
    </main>
  );
}
