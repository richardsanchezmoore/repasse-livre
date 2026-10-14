import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CentralDeOportunidades } from "@/components/CentralDeOportunidades";
import { modeloPorSlug } from "@/lib/modelosDestaque";
import { URL_BASE_SITE } from "@/lib/site";
import { SIMBOLO_MOEDA } from "@/lib/moeda";

/**
 * ═══ PÁGINA DE MODELO — /modelos/sportage ═════════════════════════════════
 *
 * ★★ Substitui o `?modelo=sportage`, que era um FILTRO: o Google trata
 * parâmetro de busca como variação da home e não indexa como página própria.
 * Pedido do Gustavo em 14/10/2026 olhando a barra de endereço.
 *
 * ★★★ E não é só cosmética de URL. Esta é a página que o produto tem material
 * de sobra para sustentar e que não existia: quantos anúncios vivos daquele
 * carro, em que faixa de preço, de que anos — tudo já calculado para a fileira
 * da home. Era conteúdo pronto sem endereço.
 *
 * ⚠️ `dynamic = "force-dynamic"` como a home: a listagem lê `searchParams` e a
 * contagem muda a cada volta da varredura. Tentar estatizar aqui repetiria o
 * incidente de CPU/ISR que já derrubou este app.
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
  // ⚠️ A descrição usa o NÚMERO, não adjetivo: "precio de referencia" sem o
  // valor é promessa; com o valor é o produto.
  const faixa = m.referencia
    ? ` Precio de referencia entre ${simbolo} ${m.referencia.min.toLocaleString("es-PY")} y ${simbolo} ${m.referencia.max.toLocaleString("es-PY")}.`
    : "";

  const titulo = `${m.rotulo} usado en Paraguay — ${m.n} anuncios y precio de referencia | AutoRadarPy`;
  const descricao =
    `${m.n} anuncios vivos de ${m.rotulo} en Paraguay, monitoreados todos los días.${faixa}` +
    ` Mediana calculada sobre anuncios reales, no una estimación.`;

  return {
    title: titulo,
    description: descricao,
    alternates: {
      canonical: `${URL_BASE_SITE}/modelos/${slug}`,
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
  // ⚠️ 404 de verdade para slug que não existe: devolver a home inteira com o
  // filtro vazio daria 200 a qualquer URL inventada, e o buscador indexaria
  // lixo com o nome do site.
  if (!m) notFound();

  /**
   * ⚠️ O modelo entra NO LUGAR do que viesse na URL, não como padrão: a página
   * é do Sportage, e `?modelo=vitz` colado nela não pode trocar o conteúdo sem
   * trocar o endereço — seria a mesma URL com dois conteúdos, que é o defeito
   * de indexação que a estrutura por caminho existe para evitar.
   */
  const comModelo = (await searchParams) ?? {};
  return (
    <CentralDeOportunidades
      searchParams={Promise.resolve({ ...comModelo, modelo: m.modelo }) as never}
      idioma="es"
    />
  );
}
