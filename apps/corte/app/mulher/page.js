import { criarSupabaseServer } from "@/lib/supabaseServer";
import { precoOferta } from "@/lib/caktoApi";
import { offerIdAtivo } from "@/lib/caktoOferta";
import FunilSwipe from "./FunilSwipe";

// Landing PRINCIPAL (/mulher) — experiência em cards full-screen (swipe) com o
// posicionamento Tipo 4 + a sessão com A Lady (chat scripted). Vende planos.kit
// Vende o Kit (O Mapa + a Coleção) a R$ 67,90. Clássica em /mulher-carta (A/B).
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Por que você ainda não está vivendo o relacionamento que gostaria?",
  description:
    "Existe uma parte da dinâmica dos relacionamentos que acontece antes mesmo de um relacionamento começar. Uma conversa com A Lady.",
};

export default async function LandingMulher() {
  const sb = await criarSupabaseServer();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const kit = cfg?.valor?.kit || {};
  const livro = cfg?.valor?.livro || {};
  // Produto principal = o LIVRO solo (order bump vende os extras). Enquanto o
  // produto Cakto do livro não estiver configurado, cai no kit (não quebra o ar).
  const prod = livro.cakto_url ? livro : kit;

  // Preço = fonte da verdade na Cakto (muda lá, reflete aqui e no checkout).
  // precoDe (âncora "de") continua no painel — é marketing, não existe na Cakto.
  let preco = prod.preco || "R$ 67,90";
  try {
    const info = await precoOferta(await offerIdAtivo(), 120); // funil = hot path, cache 2min
    if (info?.price) preco = "R$ " + info.price.toFixed(2).replace(".", ",");
  } catch { /* mantém o do painel */ }

  return (
    <main className="sw-main">
      <FunilSwipe preco={preco} precoDe={prod.preco_de || ""} url={prod.cakto_url || ""} slug={prod.cakto_slug || ""} />
    </main>
  );
}
