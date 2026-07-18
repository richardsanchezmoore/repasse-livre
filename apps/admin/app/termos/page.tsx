import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaLegal } from "@/components/PaginaLegal";
import { buscarPaginaPorSlug } from "@/lib/cms";

// Conteúdo agora vem do CMS (tabela `paginas`), editável pelo painel. ISR: revalida
// de hora em hora + na hora via revalidatePath ao salvar. Estático (sem cookies).
export const revalidate = 3600;

const SLUG = "termos";
const FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await buscarPaginaPorSlug(SLUG);
  return {
    title: pagina?.seoTitle || pagina?.titulo || "Termos de Uso",
    description: pagina?.seoDescription || "As regras para uso da plataforma Repasse Livre.",
    alternates: { canonical: `/${SLUG}` },
  };
}

export default async function TermosPage() {
  const pagina = await buscarPaginaPorSlug(SLUG);
  if (!pagina) notFound();
  return (
    <PaginaLegal titulo={pagina.titulo} atualizadoEm={FMT.format(new Date(pagina.atualizadoEm))}>
      <div dangerouslySetInnerHTML={{ __html: pagina.conteudoHtml }} />
    </PaginaLegal>
  );
}
