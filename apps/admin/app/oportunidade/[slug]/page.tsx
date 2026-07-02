import { notFound, permanentRedirect } from "next/navigation";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { caminhoOportunidade } from "@/lib/site";
import { extrairIdDaSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Rota legada: links de /oportunidade/{slug} (e o uuid puro de antes disso)
// continuam funcionando, só redirecionando pra estrutura atual
// /carros/{cidadeUf}/{slug}.
export default async function RotaOportunidadeLegada({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = extrairIdDaSlug(slug);
  const usuario = await obterUsuarioAtual();
  const oportunidade = id ? await buscarOportunidadePorId(id, usuario?.role === "admin") : null;

  if (!oportunidade) {
    notFound();
  }

  permanentRedirect(caminhoOportunidade(oportunidade));
}
