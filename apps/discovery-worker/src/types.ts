import type { AtributosOlx } from "./olxService.js";

export interface AnuncioOlx {
  titulo: string;
  marca: string | null;
  modelo: string | null;
  ano: string | null;
  cambio: string | null;
  km: number | null;
  preco: number;
  cidade: string | null;
  estado: string | null;
  fotoPrincipal: string | null;
  fotosSecundarias: string[];
  descricao: string | null;
  linkOrigem: string;
  /** Epoch em segundos da publicação/atualização do anúncio na OLX. */
  dataPublicacao: number | null;
}

export interface ReferenciaFipe {
  marca: string;
  modelo: string;
  ano: string;
  valor: number;
  mesReferencia: string;
}

export type Classificacao =
  | "oportunidade"
  | "grande_oportunidade"
  | "oportunidade_premium"
  | "top_oportunidade";

export interface Oportunidade {
  fonte: string;
  link_origem: string;
  veiculo: string;
  versao: string | null;
  ano: string | null;
  cambio: string | null;
  km: number | null;
  cidade: string | null;
  estado: string | null;
  preco: number;
  fipe_valor: number;
  fipe_data_referencia: string;
  margem_percentual: number;
  classificacao: Classificacao;
  foto_principal: string | null;
  fotos_secundarias: string[];
  descricao: string | null;
  origem_tipo: "descoberta";
  status: "descoberta";
  data_publicacao_origem: string | null;
  atributos_olx: AtributosOlx;
}
