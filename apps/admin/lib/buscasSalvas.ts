"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { UFS } from "@/lib/mascaras";

export interface ResultadoBusca {
  erro: string | null;
  sucesso: boolean;
}

/** Só dígitos → inteiro, ou null se vazio. Pra preço/km (aceita máscara "80.000"). */
function inteiroOpcional(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/\D/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Ano de 4 dígitos, ou null. Filtra lixo antes de comparar faixas. */
function anoOpcional(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(s)) return null;
  return Number(s);
}

/** Percentual (aceita "10" ou "10,5"), ou null. */
function percentualOpcional(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/[^\d.,]/g, "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function textoOpcional(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

const LIMITE_BUSCAS = 20; // teto por usuário — evita abuso/e-mail-bomba

/**
 * Cria uma busca salva do usuário logado. marca + preco_max obrigatórios; o resto
 * é opcional (afinam o matching). Escreve via service role mas SEMPRE amarrado ao
 * user_id da sessão — a RLS "dono" é a rede; esta checagem é o cinto.
 */
export async function criarBuscaSalva(
  _estadoAnterior: ResultadoBusca,
  formData: FormData,
): Promise<ResultadoBusca> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { erro: "Sessão expirada. Faça login de novo.", sucesso: false };
  if (!usuario.premium && usuario.role !== "admin") {
    return { erro: "Buscas salvas são um recurso do plano PRO.", sucesso: false };
  }

  const marca = String(formData.get("marca") ?? "").trim();
  if (!marca) return { erro: "Escolha a marca do carro que você procura.", sucesso: false };

  const preco_max = inteiroOpcional(formData.get("preco_max"));
  if (!preco_max || preco_max <= 0) {
    return { erro: "Informe o preço máximo que você pagaria.", sucesso: false };
  }

  const preco_min = inteiroOpcional(formData.get("preco_min"));
  if (preco_min != null && preco_min > preco_max) {
    return { erro: "O preço mínimo não pode ser maior que o máximo.", sucesso: false };
  }

  const ano_min = anoOpcional(formData.get("ano_min"));
  const ano_max = anoOpcional(formData.get("ano_max"));
  if (ano_min != null && ano_max != null && ano_min > ano_max) {
    return { erro: "O ano inicial não pode ser maior que o final.", sucesso: false };
  }

  const estado = textoOpcional(formData.get("estado"));
  if (estado != null && !UFS.includes(estado)) {
    return { erro: "Estado inválido.", sucesso: false };
  }

  const frequenciaRaw = String(formData.get("frequencia") ?? "na_hora");
  const frequencia = frequenciaRaw === "diario" ? "diario" : "na_hora";

  // Teto por usuário.
  const { count } = await supabaseAdmin
    .from("buscas_salvas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", usuario.id);
  if ((count ?? 0) >= LIMITE_BUSCAS) {
    return { erro: `Você atingiu o limite de ${LIMITE_BUSCAS} buscas. Apague uma para criar outra.`, sucesso: false };
  }

  const { error } = await supabaseAdmin.from("buscas_salvas").insert({
    user_id: usuario.id,
    nome: textoOpcional(formData.get("nome")),
    marca,
    modelo: textoOpcional(formData.get("modelo")),
    preco_min,
    preco_max,
    estado,
    ano_min,
    ano_max,
    km_max: inteiroOpcional(formData.get("km_max")),
    margem_min: percentualOpcional(formData.get("margem_min")),
    frequencia,
    ativo: true,
  });
  if (error) {
    console.error("[buscas] falha ao criar:", error.message);
    return { erro: "Não foi possível salvar a busca. Tente de novo.", sucesso: false };
  }

  revalidatePath("/buscas");
  return { erro: null, sucesso: true };
}

/** Liga/desliga uma busca sem apagar (pausa os alertas). Só a do próprio dono. */
export async function alternarBuscaSalva(id: string, ativo: boolean): Promise<void> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return;
  await supabaseAdmin.from("buscas_salvas").update({ ativo }).eq("id", id).eq("user_id", usuario.id);
  revalidatePath("/buscas");
}

/** Apaga uma busca do próprio dono (cascade limpa os alertas_enviados dela). */
export async function apagarBuscaSalva(id: string): Promise<void> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return;
  await supabaseAdmin.from("buscas_salvas").delete().eq("id", id).eq("user_id", usuario.id);
  revalidatePath("/buscas");
}
