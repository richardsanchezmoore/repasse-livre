import { supabase } from "./supabaseClient.js";
import type { ReferenciaFipe } from "./types.js";

/**
 * Série histórica de FIPE por modelo (tabela fipe_historico). Alimenta a
 * variação 3/6/12 meses na página individual. Ver
 * project_repasse_livre_fipe_historico.
 *
 * `garantirHistoricoFipe` é o backfill AUTOMÁTICO (igual garantirCoordenadasCidade):
 * na captação, quando um anúncio resolve seu codigo_fipe pela FIPE oficial, isto
 * garante que os últimos ~12 meses daquele modelo estão no banco, puxando do
 * mirror fipeX (que tem os meses PASSADOS completos — só atrasa o mais novo,
 * que já vem fresco da oficial). Best-effort: nunca lança, pra não derrubar a
 * captação se o mirror piscar.
 */

const MIRROR = "alanwgt/fipex-veiculos-brasil";
const DATASETS_SERVER = "https://datasets-server.huggingface.co";
const MESES_HISTORICO = 12;
// Se já temos essa quantidade de pontos pro modelo, não re-puxa o mirror (o
// backfill é uma vez por modelo; meses novos entram pelo snapshot mensal da
// oficial, não pelo mirror).
const MINIMO_PARA_PULAR = 6;

interface LinhaMirror {
  codigo_fipe: string;
  ano_modelo: number;
  sigla_combustivel: string;
  mes_referencia: number;
  ano_referencia: number;
  valor_centavos: number;
  nome_marca: string;
  nome_modelo: string;
}

/**
 * Grava o ponto do MÊS VIGENTE no histórico, a partir de uma ReferenciaFipe da
 * oficial (fresca). É o que faz a série avançar mês a mês no recálculo mensal —
 * o mirror só cobre o passado. Upsert idempotente. Best-effort.
 */
export async function registrarPontoHistoricoFipe(ref: ReferenciaFipe): Promise<void> {
  if (!ref.codigoFipe || !ref.anoModelo || !ref.mesReferenciaNum || !ref.anoReferencia) return;
  try {
    await supabase.from("fipe_historico").upsert(
      {
        codigo_fipe: ref.codigoFipe,
        ano_modelo: ref.anoModelo,
        sigla_combustivel: ref.siglaCombustivel || "-",
        mes_referencia: ref.mesReferenciaNum,
        ano_referencia: ref.anoReferencia,
        valor_centavos: Math.round(ref.valor * 100),
        nome_marca: ref.marca,
        nome_modelo: ref.modelo,
      },
      { onConflict: "codigo_fipe,ano_modelo,sigla_combustivel,ano_referencia,mes_referencia" }
    );
  } catch {
    // best-effort
  }
}

/** Backfill automático dos últimos ~12 meses de um modelo, do mirror. Idempotente. */
export async function garantirHistoricoFipe(codigoFipe: string, anoModelo: number): Promise<void> {
  try {
    const { count } = await supabase
      .from("fipe_historico")
      .select("*", { count: "exact", head: true })
      .eq("codigo_fipe", codigoFipe)
      .eq("ano_modelo", anoModelo);
    if ((count ?? 0) >= MINIMO_PARA_PULAR) return;

    // Bound pelos ~13 meses mais recentes (ano atual e o anterior) — evita
    // trazer anos de histórico que não usamos.
    const anoLimite = new Date().getUTCFullYear() - 1;
    const where = encodeURIComponent(
      `"codigo_fipe"='${codigoFipe}' AND "ano_modelo"=${anoModelo} AND "tipo_veiculo"='carro' AND "ano_referencia">=${anoLimite}`
    );
    const url = `${DATASETS_SERVER}/filter?dataset=${MIRROR}&config=default&split=train&where=${where}&offset=0&length=100`;
    const resp = await fetch(url);
    const dados = await resp.json();
    if (dados.error || !Array.isArray(dados.rows)) return;

    const linhas = (dados.rows as { row: LinhaMirror }[]).map((x) => x.row);
    // Dedup por (mês, ano, combustível) — o mirror devolve linhas repetidas.
    const porChave = new Map<string, LinhaMirror>();
    for (const l of linhas) {
      porChave.set(`${l.ano_referencia}-${l.mes_referencia}-${l.sigla_combustivel}`, l);
    }
    const recentes = [...porChave.values()]
      .sort((a, b) => b.ano_referencia - a.ano_referencia || b.mes_referencia - a.mes_referencia)
      .slice(0, MESES_HISTORICO);
    if (recentes.length === 0) return;

    const registros = recentes.map((l) => ({
      codigo_fipe: l.codigo_fipe,
      ano_modelo: l.ano_modelo,
      sigla_combustivel: l.sigla_combustivel,
      mes_referencia: l.mes_referencia,
      ano_referencia: l.ano_referencia,
      valor_centavos: l.valor_centavos,
      nome_marca: l.nome_marca,
      nome_modelo: l.nome_modelo,
    }));
    await supabase
      .from("fipe_historico")
      .upsert(registros, { onConflict: "codigo_fipe,ano_modelo,sigla_combustivel,ano_referencia,mes_referencia" });
  } catch {
    // best-effort: nunca derruba a captação por causa do histórico.
  }
}
