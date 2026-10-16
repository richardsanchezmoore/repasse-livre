import type { Metadata } from "next";
import { PaginaPublicar } from "@/components/PaginaPublicar";

/** VERSÃO EM PORTUGUÊS de /publicar — ver a nota de idioma em lib/idioma.ts. */
export const revalidate = 1800;

export const metadata: Metadata = {
  // ⚠️ SEM "— AutoRadarPy": o template do layout raiz já acrescenta.
  title: "Anunciar seu veículo",
  description:
    "Anuncie seu carro na maior vitrine organizada de veículos do Paraguai: por marca, modelo, geração e ano, ao lado do preço de referência que o comprador veio consultar.",
  alternates: { languages: { es: "/publicar", "pt-BR": "/pt/publicar", "x-default": "/publicar" }, canonical: "/pt/publicar" },
};

export default async function Pagina() {
  return <PaginaPublicar idioma="pt" />;
}
