import type { Metadata } from "next";
import { PaginaTabela } from "@/components/PaginaTabela";

/**
 * /tabla — a tabela de preços, o produto em si.
 *
 * ★★ "TABLA" e não "cotización" nem "tasación" (decidido com o Gustavo,
 * 11/10/2026): `cotización` é o que o paraguaio usa para CÂMBIO e colidiria com
 * o "cambio" que já aparece no card; `tasación` promete avaliação de um carro
 * específico, que é outro produto. E "tabla" é genérica de propósito — é a
 * palavra comum que a marca coloniza, como "FIPE" virou substantivo no Brasil.
 * O selo do card já diz "por debajo de la tabla AutoRadarPy".
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Tabla de Precios AutoRadarPy — valor de referencia de autos en Paraguay",
  description:
    "El precio de referencia del mercado paraguayo, por marca, modelo y año. Calculado sobre los anuncios reales publicados en Paraguay este mes.",
  alternates: { languages: { es: "/tabla", "pt-BR": "/pt/tabla", "x-default": "/tabla" } },
};

export default async function Pagina() {
  return <PaginaTabela />;
}
