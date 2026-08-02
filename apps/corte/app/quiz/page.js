import { redirect } from "next/navigation";
import { usuariaAtual } from "@/lib/auth";
import Quiz from "@/components/Quiz";

export const dynamic = "force-dynamic";
export const metadata = { title: "O Veredito Real · Damas Virtuosas" };

export default async function QuizPage() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/quiz");
  return <Quiz />;
}
