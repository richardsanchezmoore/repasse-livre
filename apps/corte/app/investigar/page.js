import QuizPublico from "@/components/QuizPublico";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "O Veredito Real — Ele é Cavalheiro ou Libertino? · Damas Virtuosas",
  description: "Responda 4 perguntas e descubra o Veredito sobre o seu pretendente.",
};

// Funil público (sem login): quiz → gate (e-mail + WhatsApp) → Veredito → Kit.
export default function InvestigarPage() {
  return <QuizPublico />;
}
