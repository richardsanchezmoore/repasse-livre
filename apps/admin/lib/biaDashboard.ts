import { supabaseAdmin } from "@/lib/supabase";

export interface ResumoBia {
  descobertasHoje: number;
  descobertas7d: number;
  descobertas30d: number;
  valorPotencial: number;
  anunciosPublicados: number;
  descontoMedio: number;
}

export interface PontoSerie {
  dia: string;
  quantidade: number;
}

export interface PontoValor {
  dia: string;
  valorPotencial: number;
}

export interface ItemDisputado {
  marca: string;
  modelo: string;
  quantidade: number;
  melhorMargem: number | null;
  kmMin: number | null;
  kmMax: number | null;
  /** UF onde o modelo mais aparece (líder) e em quantas UFs aparece. */
  ufLider: string;
  qtdEstados: number;
}

export interface ItemMarcaLuxo {
  marca: string;
  estado: string;
  quantidade: number;
}

export interface ItemEstadoAtivo {
  estado: string;
  quantidade: number;
  precoMedio: number;
  margemMedia: number | null;
}

export interface ItemCidadeAtiva {
  cidade: string;
  estado: string;
  quantidade: number;
  precoMedio: number;
  margemMedia: number | null;
}

export interface PontoTendenciaMensal {
  mes: string;
  marca: string;
  modelo: string;
  quantidadeMedia: number;
  margemMedia: number | null;
}

export interface ItemTendenciaDestaque {
  marca: string;
  modelo: string;
  margemMesAtual: number | null;
  margemMesAnterior: number | null;
  quantidadeMesAtual: number;
  quantidadeMesAnterior: number;
}

function lancarSeErro<T>(resultado: { data: T | null; error: { message: string } | null }, contexto: string): T {
  if (resultado.error) {
    throw new Error(`Falha ao buscar ${contexto}: ${resultado.error.message}`);
  }
  return resultado.data as T;
}

export async function buscarResumoBia(): Promise<ResumoBia> {
  const resultado = await supabaseAdmin.rpc("bia_resumo").single();
  const linha = lancarSeErro(resultado, "resumo da BIA") as {
    descobertas_hoje: number;
    descobertas_7d: number;
    descobertas_30d: number;
    valor_potencial: number;
    anuncios_publicados: number;
    desconto_medio: number;
  };
  return {
    descobertasHoje: linha.descobertas_hoje,
    descobertas7d: linha.descobertas_7d,
    descobertas30d: linha.descobertas_30d,
    valorPotencial: linha.valor_potencial,
    anunciosPublicados: linha.anuncios_publicados,
    descontoMedio: linha.desconto_medio,
  };
}

export async function buscarDescobertasPorDia(dias: number): Promise<PontoSerie[]> {
  const resultado = await supabaseAdmin.rpc("bia_descobertas_por_dia", { p_dias: dias });
  const linhas = lancarSeErro(resultado, "descobertas por dia") as Array<{ dia: string; quantidade: number }>;
  return linhas.map((linha) => ({ dia: linha.dia, quantidade: linha.quantidade }));
}

export async function buscarValorPotencialHistorico(dias: number): Promise<PontoValor[]> {
  const resultado = await supabaseAdmin.rpc("bia_valor_potencial_historico", { p_dias: dias });
  const linhas = lancarSeErro(resultado, "valor potencial histórico") as Array<{ dia: string; valor_potencial: number }>;
  return linhas.map((linha) => ({ dia: linha.dia, valorPotencial: linha.valor_potencial }));
}

// O initcap do SQL estraga siglas de marca (BMW→Bmw, GM→Gm); reverte as conhecidas.
const MARCA_CANONICA: Record<string, string> = { Bmw: "BMW", Gm: "GM" };

// Idem pra modelos com sigla/caixa especial que o initcap achata (HB20S→Hb20s).
// A UNIFICAÇÃO já aconteceu no SQL (mesma chave normalizada); aqui é só o rótulo.
const MODELO_CANONICO: Record<string, string> = {
  Hb20: "HB20",
  Hb20s: "HB20S",
  Hb20x: "HB20X",
  "Cr-V": "CR-V",
  "Hr-V": "HR-V",
  "Wr-V": "WR-V",
  Sw4: "SW4",
  "T-Cross": "T-Cross",
};

export async function buscarMaisDisputados(limite: number): Promise<ItemDisputado[]> {
  // Agrupado por MODELO (soma os estados) — não repete o mesmo modelo por UF.
  const resultado = await supabaseAdmin.rpc("bia_mais_disputados_modelo", { p_limite: limite });
  const linhas = lancarSeErro(resultado, "anúncios mais disputados") as Array<{
    marca: string;
    modelo: string;
    quantidade: number;
    melhor_margem: number | null;
    km_min: number | null;
    km_max: number | null;
    uf_lider: string;
    qtd_estados: number;
  }>;
  return linhas.map((linha) => ({
    marca: MARCA_CANONICA[linha.marca] ?? linha.marca,
    modelo: MODELO_CANONICO[linha.modelo] ?? linha.modelo,
    quantidade: linha.quantidade,
    melhorMargem: linha.melhor_margem,
    kmMin: linha.km_min,
    kmMax: linha.km_max,
    ufLider: linha.uf_lider,
    qtdEstados: linha.qtd_estados,
  }));
}

export async function buscarMarcasLuxoPorEstado(): Promise<ItemMarcaLuxo[]> {
  const resultado = await supabaseAdmin.rpc("bia_marcas_luxo_por_estado");
  const linhas = lancarSeErro(resultado, "marcas de luxo por estado") as Array<{
    marca: string;
    estado: string;
    quantidade: number;
  }>;
  return linhas;
}

export async function buscarEstadosMaisAtivos(): Promise<ItemEstadoAtivo[]> {
  const resultado = await supabaseAdmin.rpc("bia_estados_mais_ativos");
  const linhas = lancarSeErro(resultado, "estados mais ativos") as Array<{
    estado: string;
    quantidade: number;
    preco_medio: number;
    margem_media: number | null;
  }>;
  return linhas.map((linha) => ({
    estado: linha.estado,
    quantidade: linha.quantidade,
    precoMedio: linha.preco_medio,
    margemMedia: linha.margem_media,
  }));
}

export async function buscarCidadesMaisAtivas(limite: number): Promise<ItemCidadeAtiva[]> {
  const resultado = await supabaseAdmin.rpc("bia_cidades_mais_ativas", { p_limite: limite });
  const linhas = lancarSeErro(resultado, "cidades mais ativas") as Array<{
    cidade: string;
    estado: string;
    quantidade: number;
    preco_medio: number;
    margem_media: number | null;
  }>;
  return linhas.map((linha) => ({
    cidade: linha.cidade,
    estado: linha.estado,
    quantidade: linha.quantidade,
    precoMedio: linha.preco_medio,
    margemMedia: linha.margem_media,
  }));
}

export async function buscarTendenciaMensal(meses: number): Promise<PontoTendenciaMensal[]> {
  const resultado = await supabaseAdmin.rpc("bia_tendencia_mensal_por_modelo", { p_meses: meses });
  const linhas = lancarSeErro(resultado, "tendência mensal por modelo") as Array<{
    mes: string;
    marca: string;
    modelo: string;
    quantidade_media: number;
    margem_media: number | null;
  }>;
  return linhas.map((linha) => ({
    mes: linha.mes,
    marca: linha.marca,
    modelo: linha.modelo,
    quantidadeMedia: linha.quantidade_media,
    margemMedia: linha.margem_media,
  }));
}

export async function buscarTendenciaDestaques(limite: number): Promise<ItemTendenciaDestaque[]> {
  const resultado = await supabaseAdmin.rpc("bia_tendencia_destaques", { p_limite: limite });
  const linhas = lancarSeErro(resultado, "destaques de tendência mensal") as Array<{
    marca: string;
    modelo: string;
    margem_mes_atual: number | null;
    margem_mes_anterior: number | null;
    quantidade_mes_atual: number;
    quantidade_mes_anterior: number;
  }>;
  return linhas.map((linha) => ({
    marca: linha.marca,
    modelo: linha.modelo,
    margemMesAtual: linha.margem_mes_atual,
    margemMesAnterior: linha.margem_mes_anterior,
    quantidadeMesAtual: linha.quantidade_mes_atual,
    quantidadeMesAnterior: linha.quantidade_mes_anterior,
  }));
}
