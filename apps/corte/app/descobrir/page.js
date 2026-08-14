import { criarSupabaseServer } from "@/lib/supabaseServer";
import FunilLady from "./FunilLady";

// Funil "PERLA antes do PERLA" — destino de anúncio. Pública, sem login.
// Vende o Kit (que tem o PERLA como âncora) via planos.kit. noindex: é página
// de tráfego pago, não deve competir no orgânico com o resto do site.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Descubra o que “Ele” procura · Damas Virtuosas",
  description:
    "Existe uma sequência por trás das mulheres que parecem naturalmente percebidas, lembradas e desejadas. Descubra.",
  robots: { index: false, follow: false },
};

export default async function Descobrir() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const kit = cfg?.valor?.kit || {};
  return (
    <main className="funil-main">
      <FunilLady preco={kit.preco || "R$ 37,90"} url={kit.cakto_url || ""} />
    </main>
  );
}
