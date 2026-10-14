import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CentralDeOportunidades } from "@/components/CentralDeOportunidades";
import { modeloPorSlug } from "@/lib/modelosDestaque";
import { URL_BASE_SITE } from "@/lib/site";
import { SIMBOLO_MOEDA } from "@/lib/moeda";

/**
 * VERSÃO EM PORTUGUÊS de /modelos/[modelo].
 *
 * ⚠️ O SLUG DO MODELO NÃO SE TRADUZ — "sportage" é "sportage" nos dois
 * idiomas, porque é nome próprio. Só o caminho ganha o prefixo /pt, que é a
 * regra do site inteiro.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modelo: string }>;
}): Promise<Metadata> {
  const { modelo: slug } = await params;
  const m = await modeloPorSlug(slug);
  if (!m) return {};

  const simbolo = m.referencia
    ? (SIMBOLO_MOEDA[m.referencia.moeda as keyof typeof SIMBOLO_MOEDA] ?? m.referencia.moeda)
    : "";
  const faixa = m.referencia
    ? ` Preço de referência entre ${simbolo} ${m.referencia.min.toLocaleString("pt-BR")} e ${simbolo} ${m.referencia.max.toLocaleString("pt-BR")}.`
    : "";

  const titulo = `${m.rotulo} usado no Paraguai — ${m.n} anúncios e preço de referência | AutoRadarPy`;
  const descricao =
    `${m.n} anúncios vivos de ${m.rotulo} no Paraguai, monitorados todos os dias.${faixa}` +
    ` Mediana calculada sobre anúncios reais, não uma estimativa.`;

  return {
    title: titulo,
    description: descricao,
    alternates: {
      canonical: `${URL_BASE_SITE}/pt/modelos/${slug}`,
      languages: {
        es: `${URL_BASE_SITE}/modelos/${slug}`,
        pt: `${URL_BASE_SITE}/pt/modelos/${slug}`,
        "x-default": `${URL_BASE_SITE}/modelos/${slug}`,
      },
    },
    openGraph: { title: titulo, description: descricao, images: m.foto ? [m.foto] : undefined },
  };
}

export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ modelo: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { modelo: slug } = await params;
  const m = await modeloPorSlug(slug);
  if (!m) notFound();

  const comModelo = (await searchParams) ?? {};
  return (
    <CentralDeOportunidades
      searchParams={Promise.resolve({ ...comModelo, modelo: m.modelo }) as never}
      idioma="pt"
    />
  );
}
