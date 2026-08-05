import FilhosBoard from "@/components/FilhosBoard";
import { contexto } from "@/lib/membro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Filhos & Virtudes · Marta" };

export default async function Filhos() {
  const { familia } = await contexto();
  return (
    <main className="screen">
      <div className="eyebrow">🧒 Filhos & Virtudes</div>
      <h1 className="h">Formar o <span style={{ color: "var(--clay)" }}>caráter</span>, com leveza</h1>
      <FilhosBoard filhosIniciais={familia?.filhos || []} />
    </main>
  );
}
