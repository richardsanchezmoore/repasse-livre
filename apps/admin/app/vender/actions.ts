"use server";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { buscarValorFipe } from "@/lib/fipe";
import { calcularMargemPercentual, classificar, ehElegivel } from "@/lib/margin";
import { verificarTurnstileToken } from "@/lib/turnstile";
import { buscarPisoMargem } from "@/lib/configWorker";
import { PERFIS_REMETENTE, type PerfilRemetente } from "@/lib/perfilRemetente";
import { MOTIVOS_VENDA, type MotivoVenda } from "@/lib/motivoVenda";
import type { ResultadoEnvio } from "@/app/enviar/actions";

const REGEX_WHATSAPP = /^\d{10,11}$/;

function lerTexto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Envio PÚBLICO do "Vender o anúncio" (Low Ticket, R$29,90) — SEM login. Cria o
 * anúncio como `status=aguardando_pagamento` / `origem_tipo=anuncio_pago`: fica
 * FORA do board público (que só mostra `aprovada`), da fila de revisão (que é
 * `descoberta`) e das stats da BIA (que contam `descoberta`). Devolve o id do
 * anúncio pra amarrar no checkout Cakto na Fase 2 (sck=listing_{id}).
 *
 * Mantém o MESMO gate abaixo-da-FIPE (>=5%, ehElegivel) do /enviar e revalida a
 * FIPE no servidor (não confia no cliente). Validação duplicada de propósito —
 * o fluxo pago pode divergir do /enviar (spam, campos extras) sem risco de mexer
 * na action que já roda. Ver project_repasse_livre_low_ticket_vender_anuncio.
 */
export async function enviarAnuncioVenda(
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

  // Público: SEM guard de login (a conta é criada no pagamento, via webhook Cakto).

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

  const piso = await buscarPisoMargem();
  const margemPercentual = calcularMargemPercentual(preco, fipe.valor);
  if (!ehElegivel(margemPercentual, piso)) {
    return {
      erro: `Esse veículo está ${margemPercentual.toFixed(1)}% abaixo da FIPE — o mínimo pra anunciar é ${piso}%. Ajuste o preço pra entrar.`,
      sucesso: false,
    };
  }

  const classificacao = classificar(margemPercentual, piso);
  if (!classificacao) {
    return { erro: "Não foi possível classificar essa oportunidade.", sucesso: false };
  }

  const { data, error: erroInsercao } = await supabaseAdmin
    .from("opportunities")
    .insert({
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
      origem_tipo: "anuncio_pago",
      status: "aguardando_pagamento",
      whatsapp,
      nome_remetente: nomeRemetente || null,
      perfil_remetente: perfilRemetente,
      motivo_venda: motivoVenda,
      opcionais,
      sinistro_leilao: sinistroLeilao,
      criado_por: null, // vinculado à conta no pagamento (webhook Cakto)
    })
    .select("id")
    .single();

  if (erroInsercao || !data) {
    return { erro: "Falha ao salvar o anúncio. Tente novamente.", sucesso: false };
  }

  return { erro: null, sucesso: true, anuncioId: data.id as string };
}
