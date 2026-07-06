import { supabaseAdmin } from "@/lib/supabase";
import { computarFactSheet } from "./factSheet";
import type { AnuncioBia, FactSheet, PontoPreco } from "./tipos";

const CAMPOS =
  "id, fipe_codigo, veiculo, ano, estado, preco, fipe_valor, margem_percentual, km, data_captura, foto_principal, fotos_secundarias, descricao, atributos_olx, link_origem, status, copiloto_parecer";

// A coorte representa o MERCADO monitorado comparável — tudo que não foi
// rejeitado (aprovada/descoberta/enviada). Rejeitada não é oferta real.
function ehMercado(status: string | null): boolean {
  return status !== "rejeitada";
}

/**
 * Gera o fact-sheet de um anúncio na LEITURA (a parte relativa à coorte reflete
 * o mercado ATUAL). Carrega o universo (mesmo fipe_codigo, qualquer ano/região)
 * e o histórico de preço dele. Retorna null se o anúncio não tem fipe_codigo
 * (sem chave canônica não há coorte confiável — some cerca de nada hoje, já que
 * a cobertura de código está ~completa). Ver project_repasse_livre_copiloto_compra_instrumentacao.
 */
export async function gerarFactSheet(anuncioId: string): Promise<FactSheet | null> {
  const { data: bruto } = await supabaseAdmin.from("opportunities").select(CAMPOS).eq("id", anuncioId).maybeSingle();
  if (!bruto || !bruto.fipe_codigo) return null;
  const anuncio = bruto as AnuncioBia & {
    link_origem: string;
    status: string | null;
    veiculo: string | null;
    ano: string | null;
    copiloto_parecer: string | null;
  };

  const universo: AnuncioBia[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data } = await supabaseAdmin
      .from("opportunities")
      .select(CAMPOS)
      .eq("fipe_codigo", anuncio.fipe_codigo)
      .range(inicio, inicio + 999);
    if (!data || data.length === 0) break;
    universo.push(...(data as (AnuncioBia & { status: string | null })[]).filter((a) => ehMercado(a.status)));
    if (data.length < 1000) break;
  }

  const { data: log } = await supabaseAdmin
    .from("anuncio_preco_log")
    .select("preco, visto_em")
    .eq("link_origem", anuncio.link_origem);

  const fs = computarFactSheet(anuncio, universo, (log as PontoPreco[] | null) ?? []);

  // Fase C — a prosa do parecer é gerada FORA da leitura (script batch
  // gerar:pareceres) e armazenada. Aqui só LEMOS: se há prosa gravada, ela
  // substitui o parecer-base determinístico — zero delay, zero custo por view.
  // Sem prosa gravada (anúncio novo/ainda não processado) → mantém o template.
  // Ver project_repasse_livre_copiloto_compra_instrumentacao.
  if (anuncio.copiloto_parecer) fs.copiloto = anuncio.copiloto_parecer;

  return fs;
}
