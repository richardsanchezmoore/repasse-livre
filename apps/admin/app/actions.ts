"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import type { Oportunidade, StatusOportunidade } from "@/lib/types";

const MARCADOR_BUCKET_FOTOS = "/oportunidades-fotos/";

async function exigirAdmin(): Promise<void> {
  const usuario = await obterUsuarioAtual();
  if (usuario?.role !== "admin") {
    throw new Error("Apenas administradores podem realizar esta ação.");
  }
}

function caminhoArquivoNoBucket(urlFoto: string | null): string | null {
  if (!urlFoto || !urlFoto.includes(MARCADOR_BUCKET_FOTOS)) return null;
  return urlFoto.split(MARCADOR_BUCKET_FOTOS)[1] ?? null;
}

async function moverParaHistoricoEApagar(oportunidades: Oportunidade[]): Promise<void> {
  if (oportunidades.length === 0) return;

  const { error: erroHistorico } = await supabaseAdmin.from("oportunidades_historico").insert(
    oportunidades.map((o) => ({
      origem_tipo: o.origem_tipo,
      fonte: o.fonte,
      classificacao: o.classificacao,
      margem_percentual: o.margem_percentual,
      status: o.status,
      data_captura: o.data_captura,
    }))
  );
  if (erroHistorico) {
    throw new Error(`Falha ao registrar histórico: ${erroHistorico.message}`);
  }

  const caminhosFotos = oportunidades
    .map((o) => caminhoArquivoNoBucket(o.foto_principal))
    .filter((caminho): caminho is string => caminho !== null);
  if (caminhosFotos.length > 0) {
    await supabaseAdmin.storage.from("oportunidades-fotos").remove(caminhosFotos);
  }

  const { error: erroExclusao } = await supabaseAdmin
    .from("opportunities")
    .delete()
    .in(
      "id",
      oportunidades.map((o) => o.id)
    );
  if (erroExclusao) {
    throw new Error(`Falha ao apagar oportunidade(s): ${erroExclusao.message}`);
  }

  revalidatePath("/");
}

export async function apagarOportunidade(id: string): Promise<void> {
  await exigirAdmin();
  const { data, error } = await supabaseAdmin.from("opportunities").select("*").eq("id", id).single();
  if (error) {
    throw new Error(`Falha ao buscar oportunidade: ${error.message}`);
  }
  await moverParaHistoricoEApagar([data as Oportunidade]);
}

export async function apagarTodasRejeitadas(): Promise<void> {
  await exigirAdmin();
  const { data, error } = await supabaseAdmin.from("opportunities").select("*").eq("status", "rejeitada");
  if (error) {
    throw new Error(`Falha ao buscar oportunidades rejeitadas: ${error.message}`);
  }
  await moverParaHistoricoEApagar(data as Oportunidade[]);
}

export async function apagarOportunidades(ids: string[]): Promise<void> {
  await exigirAdmin();
  if (ids.length === 0) return;
  const { data, error } = await supabaseAdmin.from("opportunities").select("*").in("id", ids);
  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }
  await moverParaHistoricoEApagar(data as Oportunidade[]);
}

async function atualizarStatusEmMassa(ids: string[], status: StatusOportunidade): Promise<void> {
  await exigirAdmin();
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from("opportunities").update({ status }).in("id", ids);
  if (error) {
    throw new Error(`Falha ao atualizar status: ${error.message}`);
  }
  revalidatePath("/");
}

export async function aprovarOportunidade(id: string): Promise<void> {
  await atualizarStatusEmMassa([id], "aprovada");
}

export async function rejeitarOportunidade(id: string): Promise<void> {
  await atualizarStatusEmMassa([id], "rejeitada");
}

export async function aprovarOportunidades(ids: string[]): Promise<void> {
  await atualizarStatusEmMassa(ids, "aprovada");
}

export async function rejeitarOportunidades(ids: string[]): Promise<void> {
  await atualizarStatusEmMassa(ids, "rejeitada");
}

export async function alterarRolePerfil(userId: string, novaRole: "admin" | "publico"): Promise<void> {
  await exigirAdmin();
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.id === userId) {
    throw new Error("Você não pode alterar sua própria permissão.");
  }

  const { error } = await supabaseAdmin.from("perfis").update({ role: novaRole }).eq("user_id", userId);
  if (error) {
    throw new Error(`Falha ao alterar permissão: ${error.message}`);
  }
  revalidatePath("/usuarios");
}

export async function apagarUsuario(userId: string): Promise<void> {
  await exigirAdmin();
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.id === userId) {
    throw new Error("Você não pode excluir sua própria conta por aqui.");
  }

  // Apaga em auth.users; `perfis` e `favoritos` têm FK com ON DELETE CASCADE
  // (migration 0009), removidos automaticamente junto.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Falha ao excluir usuário: ${error.message}`);
  }
  revalidatePath("/usuarios");
}

export async function salvarConfigWorker(chave: string, valor: string): Promise<void> {
  await exigirAdmin();
  const { error } = await supabaseAdmin
    .from("worker_config")
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
  if (error) {
    throw new Error(`Falha ao salvar config "${chave}": ${error.message}`);
  }
  revalidatePath("/worker");
}

const RAILWAY_GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";

async function chamarRailwayGraphQL<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const resposta = await fetch(RAILWAY_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const dados = await resposta.json();
  if (dados.errors) {
    throw new Error(`Falha na API da Railway: ${dados.errors[0]?.message ?? "erro desconhecido"}`);
  }
  return dados.data as T;
}

/**
 * Dispara uma varredura avulsa do discovery-worker (serviço cron no
 * Railway) sem precisar entrar no painel da Railway. `deploymentRedeploy`
 * (testado primeiro) não funciona pra isso — só reconstrói o container sem
 * forçar a corrida do comando agendado. `serviceInstanceDeployV2` é a
 * mutation que o próprio botão "Run Now" do dashboard da Railway usa: pra
 * serviços cron, ela dispara uma execução avulsa sem criar um deployment
 * completo novo (Railway otimiza esse caminho internamente).
 */
export async function dispararVarreduraManual(): Promise<void> {
  await exigirAdmin();

  const token = process.env.RAILWAY_API_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !serviceId || !environmentId) {
    throw new Error("Integração com a Railway não configurada (RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID).");
  }

  await chamarRailwayGraphQL(
    token,
    `mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId }
  );
}

export async function alternarFavoritoUsuario(opportunityId: string): Promise<void> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    throw new Error("É preciso fazer login para favoritar.");
  }

  const { data: existente, error: erroBusca } = await supabaseAdmin
    .from("favoritos")
    .select("opportunity_id")
    .eq("user_id", usuario.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (erroBusca) {
    throw new Error(`Falha ao favoritar: ${erroBusca.message}`);
  }

  if (existente) {
    const { error } = await supabaseAdmin
      .from("favoritos")
      .delete()
      .eq("user_id", usuario.id)
      .eq("opportunity_id", opportunityId);
    if (error) throw new Error(`Falha ao remover favorito: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from("favoritos")
      .insert({ user_id: usuario.id, opportunity_id: opportunityId });
    if (error) throw new Error(`Falha ao favoritar: ${error.message}`);
  }

  revalidatePath("/");
}
