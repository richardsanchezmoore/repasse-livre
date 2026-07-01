import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NOME_POR_UF } from "@/lib/estados";
import { extrairMarca } from "@/lib/marca";
import { caminhoCidade, caminhoEstado, caminhoMarca, URL_BASE_SITE } from "@/lib/site";
import type { Oportunidade } from "@/lib/types";

export function BreadcrumbOportunidade({
  oportunidade,
  titulo,
  marca: marcaForcada,
  caminhoAtual,
}: {
  oportunidade: Pick<Oportunidade, "cidade" | "estado">;
  /** Título do anúncio, usado pra extrair a marca quando ela não vem resolvida (ver `marca`). */
  titulo?: string;
  /** Marca já resolvida (ex.: nas páginas de localidade, vem de buscarMarcaPorSlug) — evita repetir a
   *  heurística "primeira palavra do título" quando a marca real já é conhecida. */
  marca?: string;
  /** Caminho da página atual — o item do breadcrumb que aponta pra ela mesma fica sem link. */
  caminhoAtual?: string;
}) {
  const marca = marcaForcada ?? (titulo ? extrairMarca(titulo) : null);

  const itens: Array<{ rotulo: string; href?: string }> = [{ rotulo: "Carros", href: "/" }];

  if (oportunidade.estado) {
    itens.push({
      rotulo: NOME_POR_UF[oportunidade.estado] ?? oportunidade.estado,
      href: caminhoEstado(oportunidade.estado),
    });
  }
  if (oportunidade.cidade && oportunidade.estado) {
    itens.push({ rotulo: oportunidade.cidade, href: caminhoCidade(oportunidade) });
  }
  if (marca) {
    itens.push({ rotulo: marca, href: caminhoMarca(oportunidade, marca) });
  }

  if (caminhoAtual) {
    for (const item of itens) {
      if (item.href === caminhoAtual) item.href = undefined;
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: item.rotulo,
      item: item.href ? `${URL_BASE_SITE}${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="breadcrumb-pagina" aria-label="Breadcrumb">
        {itens.map((item, indice) => (
          <span key={`${indice}-${item.rotulo}`} className="breadcrumb-pagina-item">
            {item.href ? <Link href={item.href}>{item.rotulo}</Link> : <span>{item.rotulo}</span>}
            {indice < itens.length - 1 && (
              <ChevronRight size={13} strokeWidth={2} className="breadcrumb-pagina-separador" />
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
