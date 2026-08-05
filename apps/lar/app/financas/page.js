import FinancasTool from "@/components/FinancasTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finanças do Lar · Marta" };

export default function Financas() {
  return (
    <main className="screen">
      <div className="eyebrow">💰 Finanças do Lar</div>
      <h1 className="h">As contas da casa, <span style={{ color: "var(--clay)" }}>com paz</span></h1>
      <FinancasTool />
    </main>
  );
}
