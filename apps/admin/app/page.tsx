import type { Metadata } from "next";
import { buscarConfigSeo, buscarFotoDestaque } from "@/lib/seo";
import { CentralDeOportunidades } from "@/components/CentralDeOportunidades";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata(): Promise<Metadata> {
  const [config, foto] = await Promise.all([buscarConfigSeo("home"), buscarFotoDestaque({})]);
  if (!config) return {};

  return {
    title: config.titulo || undefined,
    description: config.descricao || undefined,
    openGraph: {
      title: config.titulo || undefined,
      description: config.descricao || undefined,
      images: foto ? [foto] : undefined,
    },
    twitter: {
      title: config.titulo || undefined,
      description: config.descricao || undefined,
      images: foto ? [foto] : undefined,
    },
  };
}



/** ★ Raiz = espanhol. A versão em português vive em app/pt/page.tsx. */
export default async function Pagina(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <CentralDeOportunidades searchParams={props.searchParams as never} idioma="es" />;
}
