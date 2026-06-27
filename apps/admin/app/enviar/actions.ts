"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { buscarValorFipe } from "@/lib/fipe";
import { calcularMargemPercentual, classificar, ehElegivel } from "@/lib/margin";
import { verificarTurnstileToken } from "@/lib/turnstile";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { PERFIS_REMETENTE, type PerfilRemetente } from "@/lib/perfilRemetente";
import { MOTIVOS_VENDA, type MotivoVenda } from "@/lib/motivoVenda";

export interface ResultadoEnvio {
  erro: string | null;
  sucesso: boolean;
}

const REGEX_WHATSAPP = /^\d{10,11}$/;

function lerTexto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

export async function enviarOportunidade(
  _estadoAnterior: ResultadoEnvio,
  formData: FormData
): Promise<ResultadoEnvio> {
  const veiculo = lerTexto(formData, "veiculo");
  const marcaCode = lerTexto(formData, "marcaCode");
  const modeloCode = lerTexto(formData, "modeloCode");
  const modeloNome = lerTexto(formData, "modeloNome");
  const anoCode = lerTexto(formData, "anoCode");
  const anoNome = lerTexto(formData, "anoNome");
  const cidade = lerTexto(formData, "cidade");
  const estado = lerTexto(formData, "estado");
  const cambio = lerTexto(formData, "cambio");
  const kmTexto = lerTexto(formData, "km");
  const precoTexto = lerTexto(formData, "preco");
  const whatsapp = lerTexto(formData, "whatsapp").replace(/\D/g, "");
  const nomeRemetente = lerTexto(formData, "nomeRemetente");
  const perfilRemetente = lerTexto(formData, "perfilRemetente");
  const motivoVenda = lerTexto(formData, "motivoVenda");
  const descricao = lerTexto(formData, "descricao");
  const turnstileToken = lerTexto(formData, "turnstileToken");
  const fotoPrincipalUrl = lerTexto(formData, "fotoPrincipalUrl");

  function lerListaJson(campo: string): string[] {
    try {
      const bruto = JSON.parse(lerTexto(formData, campo) || "[]");
      return Array.isArray(bruto) ? bruto.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  const fotosSecundarias = lerListaJson("fotosSecundariasJson");
  const opcionais = lerListaJson("opcionaisJson");
  const sinistroLeilao = lerListaJson("sinistroLeilaoJson");

  // /enviar exige conta (ver app/enviar/page.tsx) — chegar aqui sem sessão
  // só é possível burlando a UI (ex.: chamando a action direto), por isso
  // o guard se repete na action e não só na página.
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return { erro: "Você precisa estar logado para anunciar.", sucesso: false };
  }

  if (!veiculo || !marcaCode || !modeloCode || !anoCode || !precoTexto) {
    return { erro: "Preencha veículo, marca, modelo, ano e preço.", sucesso: false };
  }

  const preco = Number(precoTexto.replace(/\D/g, ""));
  if (!preco || preco <= 0) {
    return { erro: "Informe um preço válido.", sucesso: false };
  }

  if (!REGEX_WHATSAPP.test(whatsapp)) {
    return { erro: "Informe um WhatsApp válido, só números, com DDD (10 ou 11 dígitos).", sucesso: false };
  }

  if (!PERFIS_REMETENTE.includes(perfilRemetente as PerfilRemetente)) {
    return { erro: "Selecione seu perfil.", sucesso: false };
  }

  if (!MOTIVOS_VENDA.includes(motivoVenda as MotivoVenda)) {
    return { erro: "Selecione o motivo da venda.", sucesso: false };
  }

  if (!fotoPrincipalUrl) {
    return { erro: "Envie ao menos uma foto do veículo.", sucesso: false };
  }

  if (!turnstileToken) {
    return { erro: "Confirme que você não é um robô.", sucesso: false };
  }

  const captchaValido = await verificarTurnstileToken(turnstileToken);
  if (!captchaValido) {
    return { erro: "Falha na verificação do captcha. Tente novamente.", sucesso: false };
  }

  let fipe;
  try {
    fipe = await buscarValorFipe(marcaCode, modeloCode, anoCode);
  } catch {
    return { erro: "Não foi possível consultar a tabela FIPE para esse veículo. Tente novamente.", sucesso: false };
  }

  const margemPercentual = calcularMargemPercentual(preco, fipe.valor);
  if (!ehElegivel(margemPercentual)) {
    return {
      erro: `Esse veículo está ${margemPercentual.toFixed(1)}% abaixo da FIPE — o mínimo exigido é 5%.`,
      sucesso: false,
    };
  }

  const classificacao = classificar(margemPercentual);
  if (!classificacao) {
    return { erro: "Não foi possível classificar essa oportunidade.", sucesso: false };
  }

  const { error: erroInsercao } = await supabaseAdmin.from("opportunities").insert({
    fonte: "Inserção Direta",
    link_origem: `insercao-direta:${randomUUID()}`,
    veiculo,
    versao: modeloNome || null,
    ano: anoNome || anoCode,
    cambio: cambio || null,
    km: kmTexto ? Number(kmTexto) : null,
    cidade: cidade || null,
    estado: estado || null,
    preco,
    fipe_valor: fipe.valor,
    fipe_data_referencia: fipe.mesReferencia,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: fotoPrincipalUrl,
    fotos_secundarias: fotosSecundarias,
    descricao: descricao || null,
    origem_tipo: "insercao_direta",
    status: "descoberta",
    whatsapp,
    nome_remetente: nomeRemetente || null,
    perfil_remetente: perfilRemetente,
    motivo_venda: motivoVenda,
    opcionais,
    sinistro_leilao: sinistroLeilao,
    criado_por: usuario.id,
  });

  if (erroInsercao) {
    return { erro: "Falha ao salvar a oportunidade. Tente novamente.", sucesso: false };
  }

  // Primeira vez que essa conta anuncia "completa os dados" automaticamente
  // — não sobrescreve se a conta já tinha nome/whatsapp salvos (ex.: editado
  // manualmente em /completar-dados depois do envio anterior).
  if (!usuario.nome || !usuario.whatsapp) {
    await supabaseAdmin
      .from("perfis")
      .update({ nome: usuario.nome ?? (nomeRemetente || null), whatsapp: usuario.whatsapp ?? whatsapp })
      .eq("user_id", usuario.id);
  }

  revalidatePath("/");
  return { erro: null, sucesso: true };
}
