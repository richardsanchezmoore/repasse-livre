import type { Metadata } from "next";
import { PaginaTabela } from "@/components/PaginaTabela";

/**
 * VERSÃO EM PORTUGUÊS de /tabla.
 *
 * ⚠️ O SLUG CONTINUA "tabla", em espanhol. Traduzir o caminho (`/pt/tabela`)
 * daria uma URL mais bonita e um elo a menos: o selo do card, o link do menu e
 * o que as pessoas copiam falam de "la tabla". Um caminho por idioma só vale a
 * pena quando o termo é de BUSCA — e quem procura em português não procura
 * tabela de preço paraguaia.
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Tabela de Preços AutoRadarPy — valor de referência de carros no Paraguai",
  description:
    "O preço de referência do mercado paraguaio, por marca, modelo e ano. Calculado sobre os anúncios reais publicados no Paraguai neste mês.",
  alternates: { languages: { es: "/tabla", "pt-BR": "/pt/tabla", "x-default": "/tabla" } },
};

export default async function Pagina() {
  return <PaginaTabela />;
}
