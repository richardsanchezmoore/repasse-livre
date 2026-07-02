import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { resolverReferenciaFipePorValor } from "./fipeService.js";
import { garantirHistoricoFipe, registrarPontoHistoricoFipe } from "./historicoFipe.js";
import { buscarCodigoAprendido, gravarCodigoAprendido } from "./mapaAprendidoFipe.js";
import type { ReferenciaFipe } from "./types.js";

/**
 * Backfill do codigo_fipe dos anúncios (sobretudo OLX) que ficaram SEM código —
 * a chave do gráfico "Histórico Preços FIPE" da página individual.
 *
 * RESOLUÇÃO POR ÂNCORA DE VALOR (ver project_repasse_livre_fipe_ancora_valor_olx):
 * o fipe_valor guardado veio da página da OLX, que é EXATO (a OLX puxa da fonte
 * oficial na inserção do anúncio). Então achamos o código cujo valor oficial
 * ENCAIXA nesse valor — no mês vigente OU no anterior (a OLX congela o FIPE na
 * inserção, então um anúncio de junho ainda ativo mostra o FIPE de junho). Isso
 * elimina o erro do antigo fuzzy-por-texto, que casava versões VIZINHAS (ex.:
 * T-Cross Comfortline → "200 TSI", ~10% off) e gerava código errado no gráfico.
 *
 * NÃO recalcula margem NEM exclui nada: a margem da OLX é a da página (fonte de
 * verdade dela), e a versão ANTIGA deste script chegou a apagar deals reais por
 * recalcular contra um fuzzy errado. Aqui só GRAVAMOS o código quando ele
 * encaixa exato (e alimentamos a base aprendida pra acelerar as próximas). Sem
 * encaixe → segue sem código, re-tenta num próximo run. DRY-RUN por padrão;
 * --aplicar pra gravar.
 */

const APLICAR = process.argv.includes("--aplicar");

interface CodigoResolvido {
  codigoFipe: string;
  anoModelo: number;
  ref: ReferenciaFipe | null; // presente só quando resolvido fresco (pra registrar o ponto do mês)
}

async function resolverCodigo(
  veiculo: string,
  versao: string | null,
  ano: string,
  valorPagina: number
): Promise<CodigoResolvido | null> {
  const chave = versao ?? veiculo;
  const aprendido = await buscarCodigoAprendido(chave, ano);
  if (aprendido) return { codigoFipe: aprendido.codigoFipe, anoModelo: aprendido.anoModelo, ref: null };

  const pv = veiculo.trim().split(/\s+/);
  const ref = await resolverReferenciaFipePorValor(pv[0] ?? "", pv[1] ?? "", ano, versao, valorPagina).catch(() => null);
  if (!ref) return null;

  // Não grava aqui — a gravação (aprendizado) é só no modo --aplicar, pra o
  // dry-run ser 100% leitura.
  return { codigoFipe: ref.codigoFipe, anoModelo: ref.anoModelo, ref };
}

async function main(): Promise<void> {
  const TAM = 1000;
  const anuncios: { id: string; veiculo: string; versao: string | null; ano: string; fipe_valor: number }[] = [];
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, versao, ano, fipe_valor")
      .eq("origem_tipo", "descoberta")
      .is("fipe_codigo", null)
      .not("ano", "is", null)
      .not("fipe_valor", "is", null) // sem valor de página não há âncora
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    anuncios.push(...((data ?? []) as typeof anuncios));
    if (!data || data.length < TAM) break;
  }
  console.log(`[rematch-fipe] ${anuncios.length} anúncios sem código (com fipe_valor). Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);

  let resolvidos = 0;
  let viaAprendido = 0;
  let semEncaixe = 0;
  let i = 0;
  for (const a of anuncios) {
    i++;
    const achado = await resolverCodigo(a.veiculo, a.versao, a.ano, a.fipe_valor);
    if (!achado) {
      semEncaixe++;
      continue;
    }
    resolvidos++;
    if (!achado.ref) viaAprendido++;

    if (APLICAR) {
      // Só o código (e o histórico). NUNCA mexe em fipe_valor/margem/classificacao
      // — a margem da OLX é a da página. NUNCA exclui.
      await supabase.from("opportunities").update({ fipe_codigo: achado.codigoFipe }).eq("id", a.id);
      if (achado.ref) {
        await gravarCodigoAprendido(a.versao ?? a.veiculo, a.ano, achado.ref); // aprende
        await registrarPontoHistoricoFipe(achado.ref);
      }
      await garantirHistoricoFipe(achado.codigoFipe, achado.anoModelo);
    }

    if (i % 25 === 0) {
      console.log(`[rematch-fipe] ${i}/${anuncios.length} — resolvidos:${resolvidos} (aprendidos:${viaAprendido}) semEncaixe:${semEncaixe}`);
    }
  }

  console.log(
    `[rematch-fipe] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: ${resolvidos} resolvidos (${viaAprendido} via base aprendida) | ${semEncaixe} sem encaixe (ficam sem código, SEM exclusão).`
  );
}

main().catch((erro) => {
  console.error("[rematch-fipe] Falha:", erro);
  process.exitCode = 1;
});
