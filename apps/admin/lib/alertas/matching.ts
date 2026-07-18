import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarAlertasNaHora } from "./entrega";

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
  estado: string | null;
  ano: string | null;
  km: number | null;
  margem_percentual: number | null;
}

interface BuscaSalva {
  id: string;
  user_id: string;
  marca: string;
  modelo: string | null;
  preco_min: number | null;
  preco_max: number;
  estado: string | null;
  ano_min: number | null;
  ano_max: number | null;
  km_max: number | null;
  margem_min: number | null;
  frequencia: string;
}

/** Um anúncio casa uma busca? Espelha os filtros do board. Campos null na busca = "qualquer". */
export function anuncioCasaBusca(a: AnuncioParaMatch, b: BuscaSalva): boolean {
  const veic = a.veiculo.toLowerCase();

  // Marca: o `veiculo` começa com a marca (montarVeiculoPadrao / extrairMarca).
  if (!veic.startsWith(b.marca.trim().toLowerCase())) return false;
  // Modelo (opcional): substring no título, como a busca-livre do board.
  if (b.modelo && !veic.includes(b.modelo.trim().toLowerCase())) return false;

  // Preço: dentro da faixa (min opcional → 0).
  if (a.preco > b.preco_max) return false;
  if (b.preco_min != null && a.preco < b.preco_min) return false;

  // Estado: null na busca = Brasil inteiro. Senão, tem que bater.
  if (b.estado && a.estado !== b.estado) return false;

  // Ano (opcional): o `ano` do anúncio é texto ("2020"); só compara se for 4 dígitos.
  if (b.ano_min != null || b.ano_max != null) {
    const ano = /^\d{4}$/.test(a.ano ?? "") ? Number(a.ano) : null;
    if (ano == null) return false; // busca pede ano mas o anúncio não tem ano confiável
    if (b.ano_min != null && ano < b.ano_min) return false;
    if (b.ano_max != null && ano > b.ano_max) return false;
  }

  // KM (opcional): teto. Anúncio sem KM não passa num filtro de KM.
  if (b.km_max != null) {
    if (a.km == null) return false;
    if (a.km > b.km_max) return false;
  }

  // Margem mínima (opcional): % abaixo da FIPE ≥ pedido.
  if (b.margem_min != null) {
    if (a.margem_percentual == null) return false;
    if (a.margem_percentual < b.margem_min) return false;
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
      .select("id, user_id, marca, modelo, preco_min, preco_max, estado, ano_min, ano_max, km_max, margem_min, frequencia")
      .eq("ativo", true);
    if (!buscas || buscas.length === 0) return 0;

    const { data: anuncios } = await supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, preco, estado, ano, km, margem_percentual")
      .in("id", ids)
      .eq("status", "aprovada"); // garante que só alerta o que ficou público de fato
    if (!anuncios || anuncios.length === 0) return 0;

    const pendentes: { busca_id: string; opportunity_id: string }[] = [];
    for (const a of anuncios as AnuncioParaMatch[]) {
      for (const b of buscas as BuscaSalva[]) {
        if (anuncioCasaBusca(a, b)) pendentes.push({ busca_id: b.id, opportunity_id: a.id });
      }
    }
    if (pendentes.length === 0) return 0;

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
