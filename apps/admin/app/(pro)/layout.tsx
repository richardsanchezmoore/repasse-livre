import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase-server";

// Área PRO (assinatura): páginas liberadas pra quem é premium OU admin. A BIA
// (inteligência de mercado) é o benefício central do plano. noindex + guarda
// centralizados aqui, igual o (painel) faz pro admin — uma página nova só
// precisa viver em app/(pro)/ pra herdar os dois. Ver
// project_repasse_livre_premium_monetizacao.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    redirect("/login?redirect=%2Fbia");
  }
  // Não-PRO logado → manda pra vitrine do plano (upsell), não pra home.
  if (!usuario.premium && usuario.role !== "admin") {
    redirect("/planos-slim");
  }
  return children;
}
