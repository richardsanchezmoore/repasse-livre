import EntretenimentoBoard from "@/components/EntretenimentoBoard";
import { contexto } from "@/lib/membro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entretenimento · Marta" };

export default async function Jogos() {
  const { user, familia } = await contexto();
  return (
    <main className="screen">
      <div className="eyebrow">🎲 Entretenimento</div>
      <h1 className="h">Diversão <span style={{ color: "var(--clay)" }}>em família</span></h1>
      <p className="sub">Quiz bíblico pra jogar juntos e brincadeiras sem tela — pela Marta.</p>
      <EntretenimentoBoard logado={!!user} familia={familia} />
    </main>
  );
}
