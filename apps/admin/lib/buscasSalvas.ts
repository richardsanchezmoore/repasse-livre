"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarListaCidades } from "@/lib/kpisTopo";

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
  if (!usuario) return { erro: "Sesión expirada. Ingresá de nuevo.", sucesso: false };
  if (!usuario.premium && usuario.role !== "admin") {
    return { erro: "Los alertas son un recurso del plan PRO.", sucesso: false };
  }

  const marca = String(formData.get("marca") ?? "").trim();
  if (!marca) return { erro: "Elegí la marca del vehículo que buscás.", sucesso: false };

  const preco_max = inteiroOpcional(formData.get("preco_max"));
  if (!preco_max || preco_max <= 0) {
    return { erro: "Indicá el precio máximo que pagarías.", sucesso: false };
  }

  const preco_min = inteiroOpcional(formData.get("preco_min"));
  if (preco_min != null && preco_min > preco_max) {
    return { erro: "El precio mínimo no puede ser mayor que el máximo.", sucesso: false };
  }

  /**
   * ★★ A MOEDA DO ALERTA — ver a migração 0100 e o matching.
   *
   * ⚠️ Sem ela o número era comparado cru contra anúncios em duas moedas, e
   * um alerta de "até ₲50.000.000" casava um carro de "US$ 9.000".
   */
  const moedaRaw = String(formData.get("moeda") ?? "PYG").toUpperCase();
  const moeda = moedaRaw === "USD" ? "USD" : "PYG";

  const ano_min = anoOpcional(formData.get("ano_min"));
  const ano_max = anoOpcional(formData.get("ano_max"));
  if (ano_min != null && ano_max != null && ano_min > ano_max) {
    return { erro: "El año inicial no puede ser mayor que el final.", sucesso: false };
  }

  /**
   * ⚠️⚠️ A VALIDAÇÃO ERA CONTRA `UFS`, que são as siglas BRASILEIRAS. Qualquer
   * departamento paraguaio ("PY-ASU") era recusado como "Estado inválido" —
   * o campo simplesmente não podia ser usado aqui.
   *
   * ★ Agora o filtro é por CIDADE, validada contra a lista real da vitrine:
   * oferecer uma cidade onde não há anúncio é prometer um alerta que nunca
   * dispara.
   */
  const cidade = textoOpcional(formData.get("cidade"));
  if (cidade != null) {
    const cidades = await buscarListaCidades();
    if (!cidades.includes(cidade)) {
      return { erro: "Ciudad no disponible.", sucesso: false };
    }
  }

  const frequenciaRaw = String(formData.get("frequencia") ?? "na_hora");
  const frequencia = frequenciaRaw === "diario" ? "diario" : "na_hora";

  // Teto por usuário.
  const { count } = await supabaseAdmin
    .from("buscas_salvas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", usuario.id);
  if ((count ?? 0) >= LIMITE_BUSCAS) {
    return { erro: `Llegaste al límite de ${LIMITE_BUSCAS} alertas. Borrá uno para crear otro.`, sucesso: false };
  }

  const { error } = await supabaseAdmin.from("buscas_salvas").insert({
    user_id: usuario.id,
    nome: textoOpcional(formData.get("nome")),
    marca,
    modelo: textoOpcional(formData.get("modelo")),
    preco_min,
    preco_max,
    moeda,
    cidade,
    ano_min,
    ano_max,
    km_max: inteiroOpcional(formData.get("km_max")),
    margem_min: percentualOpcional(formData.get("margem_min")),
    frequencia,
    ativo: true,
  });
  if (error) {
    console.error("[buscas] falha ao criar:", error.message);
    return { erro: "No pudimos guardar el alerta. Probá de nuevo.", sucesso: false };
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
