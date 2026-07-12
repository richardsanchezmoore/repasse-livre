import type { Metadata } from "next";
import { BemVindo } from "@/components/BemVindo";
import { obterUsuarioAtual } from "@/lib/supabase-server";

// Destino pós-compra (a Cakto redireciona pra cá). Público, noindex.
export const metadata: Metadata = {
  title: "Bem-vindo ao Repasse Livre PRO",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BemVindoPage() {
  const usuario = await obterUsuarioAtual();
  return (
    <main className="vendas">
      <BemVindo logado={Boolean(usuario)} />
    </main>
  );
}
