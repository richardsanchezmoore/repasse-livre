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

/**
 * Config do worker editável pelo painel admin (tabela worker_config), com
 * fallback pro valor padrão de hoje (env var/constante) quando a chave
 * ainda não foi configurada pelo painel.
 */
export async function lerConfig(chave: string): Promise<string | null> {
  const { data, error } = await supabase.from("worker_config").select("valor").eq("chave", chave).maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler config "${chave}": ${error.message}`);
  }

  return data?.valor ?? null;
}

export interface ResultadoVarreduraRegistro {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/** Abre o registro de uma varredura em discovery_runs, retorna o id da linha. */
export async function iniciarRegistroVarredura(categoriaUrl: string, modo: string): Promise<string> {
  const { data, error } = await supabase
    .from("discovery_runs")
    .insert({ categoria_url: categoriaUrl, modo, status: "em_andamento" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao registrar início de varredura: ${error.message}`);
  }

  return data.id as string;
}

/** Fecha o registro de uma varredura como sucesso, com os contadores finais. */
export async function finalizarRegistroVarreduraComSucesso(
  id: string,
  resultado: ResultadoVarreduraRegistro
): Promise<void> {
  const { error } = await supabase
    .from("discovery_runs")
    .update({
      status: "sucesso",
      finalizado_em: new Date().toISOString(),
      novos: resultado.novos,
      elegiveis: resultado.elegiveis,
      descartados: resultado.descartados,
      sem_fipe: resultado.semFipe,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao finalizar registro de varredura: ${error.message}`);
  }
}

/** Fecha o registro de uma varredura como erro, guardando a mensagem da falha. */
export async function finalizarRegistroVarreduraComErro(id: string, erroMensagem: string): Promise<void> {
  const { error } = await supabase
    .from("discovery_runs")
    .update({ status: "erro", finalizado_em: new Date().toISOString(), erro_mensagem: erroMensagem })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao registrar erro da varredura: ${error.message}`);
  }
}
