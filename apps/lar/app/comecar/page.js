import { redirect } from "next/navigation";
import { contexto } from "@/lib/membro";
import OnboardingForm from "@/components/OnboardingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Começar · Marta" };

export default async function Comecar() {
  const { user, familia } = await contexto();
  if (!user) redirect("/entrar");

  return (
    <main className="screen">
      <div className="eyebrow">✦ Vamos nos conhecer</div>
      <h1 className="h">Me conta um pouco da <span style={{ color: "var(--clay)" }}>sua família</span></h1>
      <p className="sub">É rapidinho — e a partir daqui eu penso em tudo já pensando em vocês.</p>
      <OnboardingForm inicial={familia} />
    </main>
  );
}
