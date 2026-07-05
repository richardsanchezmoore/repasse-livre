import "dotenv/config";
import { supabase } from "./supabaseClient.js";

interface LinhaOpportunity {
  id: string;
  veiculo: string;
  km: number;
  preco: number;
  origem_tipo: string;
  fonte: string;
  classificacao: string | null;
  margem_percentual: number | null;
  status: string;
  data_captura: string;
}

/**
 * Limpeza retroativa dos duplicados de rede já existentes na base (mesmo
 * veículo+KM publicado por lojas diferentes da mesma rede de frotistas —
 * ver dedupe em tempo real em processarAnuncio, main.ts). Critério: mantém
 * a oferta de menor preço de cada grupo (veiculo, km), move as demais para
 * oportunidades_historico e apaga — mesmo que já estejam aprovada/enviada/
 * favoritada, pois são o mesmo carro repetido poluindo a base.
 *
 * Uso: npm run limpar:duplicados
 * `LIMPEZA_DRY_RUN=true` só lista os grupos com duplicata, sem apagar nada.
 */
async function executarLimpeza(): Promise<void> {
  const dryRun = process.env.LIMPEZA_DRY_RUN === "true";

  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, km, preco, origem_tipo, fonte, classificacao, margem_percentual, status, data_captura")
    .not("km", "is", null)
    .order("veiculo", { ascending: true });

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  const linhas = data as LinhaOpportunity[];
  const grupos = new Map<string, LinhaOpportunity[]>();
  for (const linha of linhas) {
    const chave = `${linha.veiculo}|${linha.km}`;
    const grupo = grupos.get(chave) ?? [];
    grupo.push(linha);
    grupos.set(chave, grupo);
  }

  let gruposComDuplicata = 0;
  let removidos = 0;

  for (const [chave, grupo] of grupos) {
    if (grupo.length < 2) continue;
    gruposComDuplicata++;

    const ordenado = [...grupo].sort((a, b) => a.preco - b.preco);
    const [mantido, ...duplicados] = ordenado;

    console.log(
      `[limpar-duplicados] "${chave}": ${grupo.length} ofertas, mantendo id ${mantido.id} (R$ ${mantido.preco}), removendo ${duplicados.length}.`
    );

    if (dryRun) continue;

    for (const duplicado of duplicados) {
      const { error: erroHistorico } = await supabase.from("oportunidades_historico").insert({
        origem_tipo: duplicado.origem_tipo,
        fonte: duplicado.fonte,
        classificacao: duplicado.classificacao,
        margem_percentual: duplicado.margem_percentual,
        status: duplicado.status,
        data_captura: duplicado.data_captura,
        veiculo: duplicado.veiculo,
        preco: duplicado.preco,
        motivo: "duplicata", // NÃO é liquidez
      });
      if (erroHistorico) {
        console.warn(`[limpar-duplicados] Falha ao registrar histórico de "${duplicado.id}": ${erroHistorico.message}`);
        continue;
      }

      const { error: erroExclusao } = await supabase.from("opportunities").delete().eq("id", duplicado.id);
      if (erroExclusao) {
        console.warn(`[limpar-duplicados] Falha ao apagar "${duplicado.id}": ${erroExclusao.message}`);
        continue;
      }
      removidos++;
    }
  }

  console.log(
    `[limpar-duplicados] Resultado: ${gruposComDuplicata} grupos com duplicata | ${removidos} oportunidades removidas${
      dryRun ? " (dry run, nada apagado)" : ""
    }.`
  );
}

executarLimpeza().catch((erro) => {
  console.error("[limpar-duplicados] Falha na execução:", erro);
  process.exitCode = 1;
});
