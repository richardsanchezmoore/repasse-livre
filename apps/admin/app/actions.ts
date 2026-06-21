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

async function atualizarStatus(id: string, status: StatusOportunidade): Promise<void> {
  await exigirAdmin();
  const { error } = await supabaseAdmin.from("opportunities").update({ status }).eq("id", id);
  if (error) {
    throw new Error(`Falha ao atualizar status: ${error.message}`);
  }
  revalidatePath("/");
}

export async function aprovarOportunidade(id: string): Promise<void> {
  await atualizarStatus(id, "aprovada");
}

export async function rejeitarOportunidade(id: string): Promise<void> {
  await atualizarStatus(id, "rejeitada");
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
