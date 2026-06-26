import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase-server";

// Toda página deste grupo é painel admin — noindex aqui cobre a categoria
// inteira de uma vez (mesma garantia que o disallow do robots.ts, mas é o
// noindex que motores de busca respeitam de fato se a página acabar linkada
// de algum lugar). Guarda de acesso também centralizada aqui: uma página
// nova só precisa viver dentro de app/(painel)/ pra herdar as duas coisas.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.role !== "admin") {
    redirect("/");
  }

  return children;
}
