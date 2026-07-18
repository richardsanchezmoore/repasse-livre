import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaLegal } from "@/components/PaginaLegal";
import { buscarPaginaPorSlug } from "@/lib/cms";

export const revalidate = 3600;

const SLUG = "exclusao-de-dados";
const FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await buscarPaginaPorSlug(SLUG);
  return {
    title: pagina?.seoTitle || pagina?.titulo || "Exclusão de dados",
    description: pagina?.seoDescription || "Como solicitar a exclusão dos seus dados e da sua conta no Repasse Livre.",
    alternates: { canonical: `/${SLUG}` },
  };
}

export default async function ExclusaoDeDadosPage() {
  const pagina = await buscarPaginaPorSlug(SLUG);
  if (!pagina) notFound();
  return (
    <PaginaLegal titulo={pagina.titulo} atualizadoEm={FMT.format(new Date(pagina.atualizadoEm))}>
      <div dangerouslySetInnerHTML={{ __html: pagina.conteudoHtml }} />
    </PaginaLegal>
  );
}
