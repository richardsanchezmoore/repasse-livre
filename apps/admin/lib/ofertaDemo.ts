import "server-only";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { buscarDemoOportunidadeId } from "@/lib/configWorker";
import { caminhoOportunidade } from "@/lib/site";

/** Dados leves do anúncio-vitrine pra montar o gatilho na /planos (sem o parecer
 *  do Copiloto — a experiência completa vem do iframe da página real). */
export interface OfertaDemo {
  /** Caminho canônico da página real do anúncio + ?embed=1 (pro iframe do modal). */
  url: string;
  veiculo: string;
  versao: string | null;
  ano: string | null;
  cidade: string | null;
  estado: string | null;
  preco: number;
  fipe_valor: number | null;
  margem_percentual: number | null;
  classificacao: string | null;
  foto_principal: string | null;
  fonte: string | null;
}

/**
 * Anúncio-vitrine configurado no painel (DEMO_OPPORTUNITY_ID). Retorna null se
 * não houver ID configurado ou o anúncio não existir/não estiver aprovado — aí a
 * /planos cai no card de exemplo estático.
 */
export async function buscarOfertaDemo(): Promise<OfertaDemo | null> {
  const id = await buscarDemoOportunidadeId();
  if (!id) return null;
  const op = await buscarOportunidadePorId(id); // só aprovada (público)
  if (!op) return null;
  return {
    url: `${caminhoOportunidade(op)}?embed=1`,
    veiculo: op.veiculo,
    versao: op.versao,
    ano: op.ano,
    cidade: op.cidade,
    estado: op.estado,
    preco: op.preco,
    fipe_valor: op.fipe_valor,
    margem_percentual: op.margem_percentual,
    classificacao: op.classificacao,
    foto_principal: op.foto_principal,
    fonte: op.fonte,
  };
}
