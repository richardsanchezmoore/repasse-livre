import CasaPlanner from "@/components/CasaPlanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ordem da Casa · Marta" };

export default function Casa() {
  return (
    <main className="screen">
      <div className="eyebrow">🧹 Ordem da Casa</div>
      <h1 className="h">Uma casa em ordem, <span style={{ color: "var(--clay)" }}>sem se matar</span></h1>
      <CasaPlanner />
    </main>
  );
}
