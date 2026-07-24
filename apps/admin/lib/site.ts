import { gerarSlugCidade, gerarSlugEstado, gerarSlugOportunidade, slugify } from "./slug";
import type { Oportunidade } from "./types";

export const URL_BASE_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://repasselivre.com").replace(/\/$/, "");

type DadosUrlOportunidade = Pick<
  Oportunidade,
  "id" | "veiculo" | "versao" | "ano" | "cidade" | "estado" | "origem_tipo"
>;

export function caminhoOportunidade(oportunidade: DadosUrlOportunidade): string {
  return `/carros/${gerarSlugCidade(oportunidade)}/${gerarSlugOportunidade(oportunidade)}`;
}

export function urlOportunidade(oportunidade: DadosUrlOportunidade): string {
  return `${URL_BASE_SITE}${caminhoOportunidade(oportunidade)}`;
}

export function caminhoCidade(oportunidade: Pick<Oportunidade, "cidade" | "estado">): string {
  return `/carros/${gerarSlugCidade(oportunidade)}`;
}

export function urlCidade(oportunidade: Pick<Oportunidade, "cidade" | "estado">): string {
  return `${URL_BASE_SITE}${caminhoCidade(oportunidade)}`;
}

export function caminhoEstado(estado: string): string {
  return `/carros/${gerarSlugEstado(estado)}`;
}

export function urlEstado(estado: string): string {
  return `${URL_BASE_SITE}${caminhoEstado(estado)}`;
}

// Marca dentro do recorte de cidade, só estado, ou nacional (nenhum dos
// dois — /carros/{marca} de nível Brasil) — mesma lógica de localidade, só
// acrescentando um segmento final /{marca}.
export function caminhoMarca(localidade: { cidade?: string | null; estado?: string | null }, marca: string): string {
  if (localidade.cidade && localidade.estado) {
    return `${caminhoCidade({ cidade: localidade.cidade, estado: localidade.estado })}/${slugify(marca)}`;
  }
  if (localidade.estado) {
    return `${caminhoEstado(localidade.estado)}/${slugify(marca)}`;
  }
  return `/carros/${slugify(marca)}`;
}

export function urlMarca(localidade: { cidade?: string | null; estado?: string | null }, marca: string): string {
  return `${URL_BASE_SITE}${caminhoMarca(localidade, marca)}`;
}

// Modelo = 1 nível abaixo da marca (/carros/{cidadeUf}/{marca}/{modelo}). Só
// cidade/estado no v1 (nacional /carros/{marca}/{modelo} conflitaria com a rota
// carro/marca). Ver project_repasse_livre_seo_pagina_modelo.
export function caminhoModelo(
  localidade: { cidade?: string | null; estado?: string | null },
  marca: string,
  modelo: string,
): string {
  return `${caminhoMarca(localidade, marca)}/${slugify(modelo)}`;
}

export function urlModelo(
  localidade: { cidade?: string | null; estado?: string | null },
  marca: string,
  modelo: string,
): string {
  return `${URL_BASE_SITE}${caminhoModelo(localidade, marca, modelo)}`;
}
