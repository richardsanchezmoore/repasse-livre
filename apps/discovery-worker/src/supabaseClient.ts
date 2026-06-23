import { createClient } from "@supabase/supabase-js";
import type { Oportunidade } from "./types.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Upsert por link_origem para evitar duplicar a mesma oportunidade entre execuções. */
export async function salvarOportunidade(oportunidade: Oportunidade): Promise<void> {
  const { error } = await supabase
    .from("opportunities")
    .upsert(oportunidade, { onConflict: "link_origem" });

  if (error) {
    throw new Error(`Falha ao salvar oportunidade (${oportunidade.link_origem}): ${error.message}`);
  }
}

export async function linkOrigemJaExiste(linkOrigem: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id")
    .eq("link_origem", linkOrigem)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar oportunidade existente: ${error.message}`);
  }

  return data !== null;
}

/**
 * Epoch (segundos) do anúncio mais recente já alcançado numa varredura
 * anterior dessa categoria, usado como referência de parada da varredura
 * incremental (em vez de "já existe no banco" — ver migration 0010).
 */
export async function obterCheckpoint(categoriaUrl: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("discovery_checkpoints")
    .select("ultimo_anuncio_em")
    .eq("categoria_url", categoriaUrl)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar checkpoint de descoberta: ${error.message}`);
  }

  return data ? Math.floor(new Date(data.ultimo_anuncio_em).getTime() / 1000) : null;
}

/** Nunca regride o checkpoint — só avança se o novo valor for mais recente. */
export async function avancarCheckpoint(categoriaUrl: string, epochSegundos: number): Promise<void> {
  const checkpointAtual = await obterCheckpoint(categoriaUrl);
  if (checkpointAtual !== null && epochSegundos <= checkpointAtual) {
    return;
  }

  const { error } = await supabase.from("discovery_checkpoints").upsert(
    {
      categoria_url: categoriaUrl,
      ultimo_anuncio_em: new Date(epochSegundos * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "categoria_url" }
  );

  if (error) {
    throw new Error(`Falha ao avançar checkpoint de descoberta: ${error.message}`);
  }
}
