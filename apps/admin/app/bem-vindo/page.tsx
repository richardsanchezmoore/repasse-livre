import type { Metadata } from "next";
import { BemVindo } from "@/components/BemVindo";

// Destino pós-compra (a Cakto redireciona pra cá). Público, noindex.
export const metadata: Metadata = {
  title: "Bem-vindo ao Repasse Livre PRO",
  robots: { index: false, follow: false },
};

export default function BemVindoPage() {
  return (
    <main className="vendas">
      <BemVindo />
    </main>
  );
}
