import { criarSupabaseServer } from "@/lib/supabaseServer";
import FunilSwipe from "./FunilSwipe";

// Landing PRINCIPAL (/mulher) — experiência em cards full-screen (swipe) com o
// posicionamento Tipo 4 + a sessão com A Lady (chat scripted). Vende planos.kit
// (R$ 37,90). A versão clássica de landing vive em /mulher-carta (A/B).
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Você está procurando no lugar certo? · Damas Virtuosas",
  description:
    "Existem três caminhos que ensinam a mulher sobre amor. Descobrimos um quarto. Uma experiência de descoberta com A Lady.",
};

export default async function LandingMulher() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const kit = cfg?.valor?.kit || {};
  return (
    <main className="sw-main">
      <FunilSwipe preco={kit.preco || "R$ 37,90"} url={kit.cakto_url || ""} />
    </main>
  );
}
