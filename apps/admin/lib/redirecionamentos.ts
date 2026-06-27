import { permanentRedirect, notFound } from "next/navigation";
import { supabaseAdmin } from "./supabase";

// Sentinela pro redirecionamento padrão (catch-all) — mesma tabela
// `redirecionamentos`, só reservando essa origem especial pra quando nenhum
// outro nível de fallback resolve (ver redirecionarOuNotFound).
export const ORIGEM_PADRAO_CATCH_ALL = "*";

export interface Redirecionamento {
  origem: string;
  destino: string;
  criado_em: string;
}

/** Exclui a entrada catch-all — essa é exibida em campo próprio no painel, não na lista. */
export async function buscarTodosRedirecionamentos(): Promise<Redirecionamento[]> {
  const { data } = await supabaseAdmin.from("redirecionamentos").select("*").order("criado_em", { ascending: false });
  return (data ?? []).filter((linha) => linha.origem !== ORIGEM_PADRAO_CATCH_ALL);
}

export async function buscarRedirecionamentoPadrao(): Promise<string | null> {
  return buscarRedirecionamento(ORIGEM_PADRAO_CATCH_ALL);
}

async function buscarRedirecionamento(origem: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("redirecionamentos").select("destino").eq("origem", origem).maybeSingle();
  return data?.destino ?? null;
}

/**
 * Chamar no lugar de notFound() direto em qualquer página de /carros.
 * Resolve em 3 níveis, do mais específico pro mais genérico, parando no
 * primeiro que existir:
 *  1. Redirecionamento exato cadastrado pra esse caminho.
 *  2. `opcoes.fallback` — fallback inteligente que o próprio call site já
 *     sabe ser razoável (ex.: anúncio apagado → cai pra página da cidade).
 *     Não precisa de nenhum cadastro manual: cobre o caso comum de apagar
 *     vários anúncios de uma vez sem precisar de um redirecionamento por
 *     anúncio. O destino passa pelo mesmo crivo de novo (se a cidade também
 *     não existir mais, o 404/redirect dela própria assume a partir daí).
 *  3. Redirecionamento padrão (catch-all, `opcoes.usarPadrao`) — último
 *     recurso configurável no painel, pra quando nem a cidade/estado/marca
 *     da URL resolve mais nada.
 * Sem nenhum dos três, cai no notFound() normal.
 */
export async function redirecionarOuNotFound(
  caminhoAtual: string,
  opcoes?: { fallback?: string; usarPadrao?: boolean }
): Promise<never> {
  const destino = await buscarRedirecionamento(caminhoAtual);
  if (destino) {
    permanentRedirect(destino);
  }
  if (opcoes?.fallback) {
    permanentRedirect(opcoes.fallback);
  }
  if (opcoes?.usarPadrao) {
    const padrao = await buscarRedirecionamentoPadrao();
    if (padrao) {
      permanentRedirect(padrao);
    }
  }
  notFound();
}
