import { supabaseAdmin } from "@/lib/supabase";

/**
 * Série histórica de FIPE de um veículo (por codigo_fipe + ano), pra o gráfico
 * "Histórico de Preços" da página individual. Ver
 * project_repasse_livre_fipe_historico (Bloco C).
 *
 * SERVER-ONLY (usa supabaseAdmin / service role) — nunca importar de um
 * componente "use client"; o gráfico recebe a série já pronta por props (ver
 * split client-safe, project_repasse_livre_client_safe_split).
 */

export interface PontoHistoricoFipe {
  /** Rótulo curto do mês, ex.: "jul/25". */
  rotulo: string;
  /** Valor da FIPE em reais. */
  valor: number;
  /** Chave cronológica (ano*12+mes) pra ordenar/cortar por período. */
  ordem: number;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export async function buscarHistoricoFipe(
  codigoFipe: string | null,
  ano: string | null
): Promise<PontoHistoricoFipe[]> {
  if (!codigoFipe || !ano) return [];
  const anoModelo = Number.parseInt(ano, 10);
  if (!Number.isFinite(anoModelo)) return [];

  const { data, error } = await supabaseAdmin
    .from("fipe_historico")
    .select("mes_referencia, ano_referencia, valor_centavos")
    .eq("codigo_fipe", codigoFipe)
    .eq("ano_modelo", anoModelo)
    .order("ano_referencia", { ascending: true })
    .order("mes_referencia", { ascending: true });

  if (error || !data) return [];

  // Um ponto por mês (o codigo+ano pode ter mais de uma sigla de combustível;
  // pra exibição pegamos um valor por mês).
  const porMes = new Map<number, PontoHistoricoFipe>();
  for (const linha of data) {
    const ordem = linha.ano_referencia * 12 + linha.mes_referencia;
    if (porMes.has(ordem)) continue;
    porMes.set(ordem, {
      rotulo: `${MESES_ABREV[linha.mes_referencia - 1]}/${String(linha.ano_referencia).slice(2)}`,
      valor: linha.valor_centavos / 100,
      ordem,
    });
  }
  return [...porMes.values()].sort((a, b) => a.ordem - b.ordem);
}
