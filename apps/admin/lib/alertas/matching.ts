import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarAlertasNaHora } from "./entrega";
import { PAIS_DO_SITE } from "@/lib/site";
import { buscarCotacao } from "@/lib/moeda";
import { buscarTabelaReferencia } from "@/lib/tabelaReferencia";

/**
 * MATCHING de alertas: dado um anúncio recém-APROVADO, acha as buscas salvas ativas
 * que ele satisfaz e registra o alerta pendente (dedupe via unique). NÃO envia aqui —
 * a entrega (e-mail imediato / resumo diário) é um passo separado.
 *
 * Por que na APROVAÇÃO e não na captação: anúncio novo nasce "descoberta" = 404 pro
 * público. Alertar na captação mandaria link quebrado. `atualizarStatusEmMassa` chama
 * isto quando o status vira "aprovada" — aí o link já funciona.
 *
 * A chave do matching são os MESMOS filtros do board, invertidos: em vez de o usuário
 * filtrar a lista, o anúncio testa cada busca. marca/modelo casam contra o texto
 * `veiculo` (não há coluna marca/modelo); o resto são comparações diretas de coluna.
 */

interface AnuncioParaMatch {
  id: string;
  veiculo: string;
  preco: number;
  /** ⚠️ 74% guarani / 26% dólar — comparar número com número é erro. */
  moeda: string | null;
  cidade: string | null;
  estado: string | null;
  ano: string | null;
  km: number | null;
  /** ★ Colunas próprias (98%/96% preenchidas); o texto de `veiculo` é a rede. */
  marca: string | null;
  modelo: string | null;
  geracao: string | null;
  margem_percentual: number | null;
}

interface BuscaSalva {
  id: string;
  user_id: string;
  marca: string;
  modelo: string | null;
  preco_min: number | null;
  preco_max: number;
  moeda: string | null;
  cidade: string | null;
  estado: string | null;
  ano_min: number | null;
  ano_max: number | null;
  km_max: number | null;
  margem_min: number | null;
  frequencia: string;
}

/**
 * ★★ A MARCA/MODELO AGORA TÊM COLUNA. O casamento original era
 * `veiculo.startsWith(marca)` porque em 2026, no Repasse Livre, marca e modelo
 * não existiam como colunas — só o texto. No Paraguai o normalizador preenche
 * `marca` em 98% e `modelo` em 96%, e comparar coluna com coluna é mais certo
 * que comparar prefixo de string.
 *
 * ⚠️ O texto FICA como rede, para os 2% sem coluna: perder um anúncio bom por
 * formalidade de esquema é pior que um casamento a mais.
 */
function casaMarcaModelo(a: AnuncioParaMatch, b: BuscaSalva): boolean {
  const pedida = b.marca.trim().toLowerCase();
  const marcaOk = a.marca
    ? a.marca.trim().toLowerCase() === pedida
    : a.veiculo.toLowerCase().startsWith(pedida);
  if (!marcaOk) return false;

  if (!b.modelo) return true;
  const modeloPedido = b.modelo.trim().toLowerCase();
  return a.modelo
    ? a.modelo.trim().toLowerCase().includes(modeloPedido)
    : a.veiculo.toLowerCase().includes(modeloPedido);
}

/**
 * ★★★ PREÇO COM MOEDA — e isto é conserto de um erro que mandaria e-mail errado.
 *
 * A busca guardava um número solto. Com 74% dos anúncios em guarani e 26% em
 * dólar, um alerta de "até ₲50.000.000" casava um Hilux de "US$ 9.000"
 * (9.000 ≤ 50.000.000) e um alerta de "até US$ 10.000" não casava quase nada.
 *
 * ⚠️ Quando as moedas diferem é preciso CONVERTER, e conversão exige cotação.
 * Aqui a regra é conservadora de propósito: **sem cotação, só casa moeda
 * igual**. Um alerta que deixa de disparar é um incômodo; um alerta que
 * dispara com o preço errado destrói a confiança no produto.
 */
function precoNaFaixa(a: AnuncioParaMatch, b: BuscaSalva, taxaUsdParaPyg: number | null): boolean {
  const moedaAnuncio = (a.moeda ?? "PYG").toUpperCase();
  const moedaBusca = (b.moeda ?? "PYG").toUpperCase();

  let preco = a.preco;
  if (moedaAnuncio !== moedaBusca) {
    if (!taxaUsdParaPyg || taxaUsdParaPyg <= 0) return false;
    preco = moedaAnuncio === "USD" ? a.preco * taxaUsdParaPyg : a.preco / taxaUsdParaPyg;
  }

  if (preco > b.preco_max) return false;
  if (b.preco_min != null && preco < b.preco_min) return false;
  return true;
}

/**
 * Um anúncio casa uma busca? Campos null na busca = "qualquer".
 *
 * ⚠️ `refDaTabela` é a mediana da NOSSA tabela para aquele carro, na moeda do
 * anúncio, e só é consultada quando a busca pede margem. Ver `margem_min`.
 */
export function anuncioCasaBusca(
  a: AnuncioParaMatch,
  b: BuscaSalva,
  contexto?: { taxaUsdParaPyg?: number | null; refDaTabela?: (a: AnuncioParaMatch) => number | null },
): boolean {
  if (!casaMarcaModelo(a, b)) return false;
  if (!precoNaFaixa(a, b, contexto?.taxaUsdParaPyg ?? null)) return false;

  // ★ Cidade é o filtro que o comprador paraguaio entende; o departamento
  //   ("PY-ASU") fica como compatibilidade da era brasileira.
  if (b.cidade && a.cidade !== b.cidade) return false;
  if (b.estado && a.estado !== b.estado) return false;

  // Ano (opcional): o `ano` do anúncio é texto ("2020"); só compara se for 4 dígitos.
  if (b.ano_min != null || b.ano_max != null) {
    const ano = /^\d{4}$/.test(a.ano ?? "") ? Number(a.ano) : null;
    if (ano == null) return false; // busca pede ano mas o anúncio não tem ano confiável
    if (b.ano_min != null && ano < b.ano_min) return false;
    if (b.ano_max != null && ano > b.ano_max) return false;
  }

  // KM (opcional): teto. ⚠️ Anúncio sem KM não passa — e no Paraguai isso é
  // 68% da base, porque o Facebook raramente traz o campo. O formulário AVISA
  // isso em vez de deixar o usuário descobrir pelo silêncio.
  if (b.km_max != null) {
    if (a.km == null) return false;
    if (a.km > b.km_max) return false;
  }

  /**
   * ★★★ MARGEM = % ABAIXO DA NOSSA TABELA, não da FIPE.
   *
   * ⚠️⚠️ `margem_percentual` e `fipe_valor` estão NULOS em 100% dos anúncios
   * paraguaios — não existe FIPE aqui. Mantido como estava, um alerta com
   * margem nunca mandaria um e-mail, para sempre, sem sinal nenhum.
   *
   * ★ E a troca não é um remendo: é O diferencial. "Me avise quando entrar um
   * Vitz 15% abaixo da referência do mercado paraguaio" é uma frase que só
   * nós podemos cumprir, porque a referência é nossa.
   *
   * ⚠️ Sem referência para o carro, NÃO casa. É o mesmo princípio do corretor
   * de preço: sem árbitro, não se afirma.
   */
  if (b.margem_min != null) {
    const ref = contexto?.refDaTabela?.(a) ?? null;
    if (ref == null || ref <= 0) {
      // Compatibilidade: se um dia houver FIPE de novo, ela ainda vale.
      if (a.margem_percentual == null) return false;
      if (a.margem_percentual < b.margem_min) return false;
      return true;
    }
    const abaixo = ((ref - a.preco) / ref) * 100;
    if (abaixo < b.margem_min) return false;
  }

  return true;
}

/**
 * Roda o matching pros anúncios recém-aprovados e registra os alertas pendentes.
 * Best-effort: qualquer erro é logado, nunca derruba a aprovação. Retorna quantos
 * pares (busca, anúncio) novos foram registrados.
 */
export async function registrarAlertasParaAprovados(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    // Só buscas ativas — o índice parcial idx_buscas_salvas_ativas cobre.
    const { data: buscas } = await supabaseAdmin
      .from("buscas_salvas")
      .select("id, user_id, marca, modelo, preco_min, preco_max, moeda, cidade, estado, ano_min, ano_max, km_max, margem_min, frequencia")
      .eq("ativo", true);
    if (!buscas || buscas.length === 0) return 0;

    const { data: anuncios } = await supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, preco, moeda, cidade, estado, ano, km, marca, modelo, geracao, margem_percentual")
      .in("id", ids)
      .eq("status", "aprovada").eq("pais", PAIS_DO_SITE); // garante que só alerta o que ficou público de fato
    if (!anuncios || anuncios.length === 0) return 0;

    /**
     * ★ O CONTEXTO é montado UMA VEZ por lote, não por par.
     *
     * ⚠️ São até 300 anúncios × N buscas; buscar cotação ou tabela dentro do
     * laço seria uma chamada por combinação. A cotação é uma só, e a tabela
     * de referência é um mapa carregado de uma vez.
     *
     * ⚠️ As duas são opcionais e falham em silêncio: alerta é best-effort e
     * nunca pode derrubar a aprovação. Sem cotação, só casa moeda igual; sem
     * tabela, a busca com margem não casa — ver `anuncioCasaBusca`.
     */
    const precisaCotacao = buscas.some((b) => (b.moeda ?? "PYG") !== "PYG") ||
      anuncios.some((a: { moeda?: string | null }) => (a.moeda ?? "PYG") !== "PYG");
    const precisaTabela = buscas.some((b) => b.margem_min != null);

    const [cotacao, tabela] = await Promise.all([
      precisaCotacao ? buscarCotacao().catch(() => null) : Promise.resolve(null),
      precisaTabela ? buscarTabelaReferencia().catch(() => []) : Promise.resolve([]),
    ]);

    // Quantos guaranis vale 1 dólar: as duas taxas vêm "por real", então a
    // divisão cancela o real e sobra o par que interessa.
    const taxaUsdParaPyg =
      cotacao && cotacao.porReal.PYG > 0 ? cotacao.porReal.USD / cotacao.porReal.PYG : null;

    const porChave = new Map<string, number>();
    for (const l of tabela) {
      porChave.set(`${String(l.modelo).toLowerCase()}|${l.chave}|${l.moeda}`, Number(l.mediana));
    }
    // ⚠️ Ano antes de geração: é a referência mais estreita, portanto a mais
    // confiável para julgar um anúncio individual. Mesma ordem do corretor.
    const refDaTabela = (a: AnuncioParaMatch): number | null => {
      if (!a.modelo) return null;
      const m = a.modelo.toLowerCase();
      const moeda = (a.moeda ?? "PYG").toUpperCase();
      for (const chave of [a.ano ?? null, a.geracao ?? null]) {
        if (!chave) continue;
        const v = porChave.get(`${m}|${chave}|${moeda}`);
        if (v) return v;
      }
      return null;
    };

    const pendentes: { busca_id: string; opportunity_id: string }[] = [];
    for (const a of anuncios as AnuncioParaMatch[]) {
      for (const b of buscas as BuscaSalva[]) {
        if (anuncioCasaBusca(a, b, { taxaUsdParaPyg, refDaTabela })) {
          pendentes.push({ busca_id: b.id, opportunity_id: a.id });
        }
      }
    }

    // ON CONFLICT DO NOTHING via ignoreDuplicates: nunca 2× o mesmo (busca, anúncio).
    const { error } = await supabaseAdmin
      .from("alertas_enviados")
      .upsert(pendentes, { onConflict: "busca_id,opportunity_id", ignoreDuplicates: true });
    if (error) {
      console.error("[alertas] falha ao registrar pendentes:", error.message);
      return 0;
    }

    // Registrados os pendentes, os de frequência 'na_hora' saem imediatamente
    // (o timing É o produto). Os 'diario' ficam na fila pro cron do resumo.
    // Best-effort: um par só vira enviado quando o Resend confirma.
    await enviarAlertasNaHora(ids);

    return pendentes.length;
  } catch (e) {
    console.error("[alertas] matching falhou (ignorado):", e instanceof Error ? e.message : e);
    return 0;
  }
}
