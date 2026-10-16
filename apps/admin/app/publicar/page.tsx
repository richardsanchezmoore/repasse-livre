import type { Metadata } from "next";
import { PaginaPublicar } from "@/components/PaginaPublicar";

/**
 * ⚠️ NÃO confundir com `/vender`: aquela é a landing BRASILEIRA da era Repasse
 * Livre (FIPE, português, inserção paga) e continua `noindex`. Esta é a do
 * Paraguai, e por ora NÃO vende a inserção — ver o cabeçalho do componente.
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Publicar su vehículo — AutoRadarPy",
  description:
    "Publique su auto en la mayor vitrina organizada de vehículos del Paraguay: por marca, modelo, generación y año, al lado del precio de referencia que el comprador vino a consultar.",
  alternates: { languages: { es: "/publicar", "pt-BR": "/pt/publicar", "x-default": "/publicar" }, canonical: "/publicar" },
};

export default async function Pagina() {
  return <PaginaPublicar idioma="es" />;
}
