import { permanentRedirect, notFound } from "next/navigation";
import { supabaseAdmin } from "./supabase";

export interface Redirecionamento {
  origem: string;
  destino: string;
  criado_em: string;
}

export async function buscarTodosRedirecionamentos(): Promise<Redirecionamento[]> {
  const { data } = await supabaseAdmin.from("redirecionamentos").select("*").order("criado_em", { ascending: false });
  return data ?? [];
}

async function buscarRedirecionamento(origem: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("redirecionamentos").select("destino").eq("origem", origem).maybeSingle();
  return data?.destino ?? null;
}

/**
 * Chamar no lugar de notFound() direto em qualquer página de /carros — se
 * existir um redirecionamento cadastrado pra esse caminho exato, manda
 * 308 (permanente) pra URL nova em vez de devolver 404 e perder o link
 * equity que o Google já tinha indexado. Sem entrada cadastrada, cai no
 * notFound() normal.
 */
export async function redirecionarOuNotFound(caminhoAtual: string): Promise<never> {
  const destino = await buscarRedirecionamento(caminhoAtual);
  if (destino) {
    permanentRedirect(destino);
  }
  notFound();
}
