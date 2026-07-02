import { supabase } from "./supabaseClient.js";
import type { ReferenciaFipe } from "./types.js";

/**
 * Base APRENDIDA veículo→código FIPE (tabela fipe_mapa_aprendido). Alimentada
 * pela âncora de valor da OLX: quando o valor da página encaixa exato num código
 * oficial, gravamos aqui. Depois, o mesmo veículo resolve por HIT direto — sem
 * fuzzy, sem chamada FIPE. Ver project_repasse_livre_fipe_ancora_valor_olx.
 *
 * A assinatura é o texto do veículo (versão/modelo, que vem dos dropdowns da
 * OLX e é consistente entre anúncios do mesmo carro) normalizado + o ano. Cai
 * pro título quando não há versão.
 */

const DIACRITICOS = /[̀-ͯ]/g;

function assinatura(textoVeiculo: string, ano: string): { assinatura: string; ano: number } {
  const norm = textoVeiculo
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return { assinatura: norm, ano: Number.parseInt(ano, 10) };
}

export interface CodigoAprendido {
  codigoFipe: string;
  anoModelo: number;
}

/** HIT direto: já aprendemos o código desse veículo? (sem tocar na FIPE) */
export async function buscarCodigoAprendido(textoVeiculo: string, ano: string): Promise<CodigoAprendido | null> {
  const chave = assinatura(textoVeiculo, ano);
  if (!chave.assinatura || !Number.isFinite(chave.ano)) return null;
  try {
    const { data } = await supabase
      .from("fipe_mapa_aprendido")
      .select("codigo_fipe, ano_modelo")
      .eq("assinatura", chave.assinatura)
      .eq("ano", chave.ano)
      .maybeSingle();
    if (!data) return null;
    return { codigoFipe: data.codigo_fipe, anoModelo: data.ano_modelo };
  } catch {
    return null;
  }
}

/** Aprende (upsert) o mapeamento veículo→código confirmado pela âncora de valor. */
export async function gravarCodigoAprendido(textoVeiculo: string, ano: string, ref: ReferenciaFipe): Promise<void> {
  const chave = assinatura(textoVeiculo, ano);
  if (!chave.assinatura || !Number.isFinite(chave.ano)) return;
  try {
    await supabase.from("fipe_mapa_aprendido").upsert(
      {
        assinatura: chave.assinatura,
        ano: chave.ano,
        codigo_fipe: ref.codigoFipe,
        ano_modelo: ref.anoModelo,
        valor_centavos_confirmado: Math.round(ref.valor * 100),
        nome_modelo: ref.modelo,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "assinatura,ano" }
    );
  } catch {
    // best-effort: nunca derruba a captação por causa do aprendizado.
  }
}
