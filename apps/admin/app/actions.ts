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
      veiculo: o.veiculo,
      versao: o.versao,
      ano: o.ano,
      estado: o.estado,
      preco: o.preco,
      fipe_codigo: o.fipe_codigo,
      data_publicacao_origem: o.data_publicacao_origem,
      ultimo_visto: o.ultimo_visto,
      motivo: "admin", // exclusão manual — NÃO é liquidez de mercado
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
  revalidatePath("/sitemap.xml");
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
  revalidatePath("/sitemap.xml");
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

export async function salvarConfigSeo(chave: string, dados: { titulo: string; descricao: string }): Promise<void> {
  await exigirAdmin();
  const { error } = await supabaseAdmin.from("seo_paginas").upsert(
    {
      chave,
      titulo: dados.titulo || null,
      descricao: dados.descricao || null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );
  if (error) {
    throw new Error(`Falha ao salvar SEO "${chave}": ${error.message}`);
  }
  revalidatePath("/seo");
  revalidatePath("/");
}

export async function salvarConfigRastreio(chave: string, valor: string): Promise<void> {
  await exigirAdmin();
  const { error } = await supabaseAdmin
    .from("config_rastreio")
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
  if (error) {
    throw new Error(`Falha ao salvar rastreio "${chave}": ${error.message}`);
  }
  revalidatePath("/seo");
  revalidatePath("/");
}

export async function criarRedirecionamento(origem: string, destino: string): Promise<void> {
  await exigirAdmin();
  const origemNormalizada = origem.trim();
  const destinoNormalizado = destino.trim();
  if (!origemNormalizada || !destinoNormalizado) {
    throw new Error("Origem e destino são obrigatórios.");
  }
  if (origemNormalizada === destinoNormalizado) {
    throw new Error("Origem e destino não podem ser o mesmo caminho (criaria um loop).");
  }
  const { error } = await supabaseAdmin
    .from("redirecionamentos")
    .upsert({ origem: origemNormalizada, destino: destinoNormalizado }, { onConflict: "origem" });
  if (error) {
    throw new Error(`Falha ao salvar redirecionamento: ${error.message}`);
  }
  revalidatePath("/seo");
}

export async function apagarRedirecionamento(origem: string): Promise<void> {
  await exigirAdmin();
  const { error } = await supabaseAdmin.from("redirecionamentos").delete().eq("origem", origem);
  if (error) {
    throw new Error(`Falha ao apagar redirecionamento: ${error.message}`);
  }
  revalidatePath("/seo");
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
 * Railway) sem precisar entrar no painel da Railway.
 *
 * Tentativas anteriores que não funcionam pra serviços cron:
 * - `deploymentRedeploy`: só reconstrói o container atual, não força a
 *   corrida do comando agendado.
 * - `serviceInstanceDeployV2`: a Railway otimiza o caminho de "nada mudou,
 *   nada a fazer" quando o commit já é o vigente — não dispara execução.
 *
 * `deploymentInstanceExecutionCreate` é a mutation que o botão "Run Now" do
 * dashboard realmente chama (capturada via DevTools/Network ao clicar no
 * botão) — recebe um `serviceInstanceId` (não o `serviceId`/`environmentId`
 * direto), buscado antes via a query pública `serviceInstance`.
 */
export async function dispararVarreduraManual(): Promise<void> {
  await exigirAdmin();

  const token = process.env.RAILWAY_API_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !serviceId || !environmentId) {
    throw new Error("Integração com a Railway não configurada (RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID).");
  }

  const dadosInstancia = await chamarRailwayGraphQL<{ serviceInstance: { id: string } }>(
    token,
    `query($serviceId: String!, $environmentId: String!) {
      serviceInstance(serviceId: $serviceId, environmentId: $environmentId) { id }
    }`,
    { serviceId, environmentId }
  );

  const serviceInstanceId = dadosInstancia.serviceInstance?.id;
  if (!serviceInstanceId) {
    throw new Error("Não encontrei o serviceInstance do worker na Railway (serviceId/environmentId podem estar errados).");
  }

  await chamarRailwayGraphQL(
    token,
    `mutation($input: DeploymentInstanceExecutionCreateInput!) {
      deploymentInstanceExecutionCreate(input: $input)
    }`,
    { input: { serviceInstanceId } }
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
