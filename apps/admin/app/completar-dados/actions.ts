"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export interface ResultadoCompletarDados {
  erro: string | null;
  sucesso: boolean;
}

const REGEX_WHATSAPP = /^\d{10,11}$/;

export async function salvarDadosCompletos(
  _estadoAnterior: ResultadoCompletarDados,
  formData: FormData
): Promise<ResultadoCompletarDados> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return { erro: "Sessão expirada. Faça login de novo.", sucesso: false };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");

  if (!nome) {
    return { erro: "Informe seu nome.", sucesso: false };
  }
  if (!REGEX_WHATSAPP.test(whatsapp)) {
    return { erro: "Informe um WhatsApp válido, só números, com DDD (10 ou 11 dígitos).", sucesso: false };
  }

  const { error } = await supabaseAdmin.from("perfis").update({ nome, whatsapp }).eq("user_id", usuario.id);
  if (error) {
    return { erro: "Falha ao salvar. Tente novamente.", sucesso: false };
  }

  revalidatePath("/", "layout");
  return { erro: null, sucesso: true };
}
