import type { Metadata } from "next";
import { AnuncioPublicado } from "@/components/AnuncioPublicado";
import { obterUsuarioAtual } from "@/lib/supabase-server";

// Destino pós-pagamento do produto ANUNCIAR (a Cakto redireciona pra cá). Público,
// noindex. Separado do /bem-vindo (que é do Ticto/PRO). Ver
// project_repasse_livre_low_ticket_vender_anuncio.
export const metadata: Metadata = {
  title: "Anúncio publicado — Repasse Livre",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ObrigadoVenderPage() {
  const usuario = await obterUsuarioAtual();
  return (
    <main className="vendas">
      <AnuncioPublicado logado={Boolean(usuario)} />
    </main>
  );
}
