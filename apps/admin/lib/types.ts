export type StatusOportunidade = "descoberta" | "aprovada" | "rejeitada" | "enviada" | "favoritada";

export interface Oportunidade {
  id: string;
  fonte: string;
  link_origem: string;
  veiculo: string;
  versao: string | null;
  ano: string | null;
  cambio: string | null;
  cidade: string | null;
  estado: string | null;
  preco: number;
  fipe_valor: number | null;
  margem_percentual: number | null;
  classificacao: string | null;
  foto_principal: string | null;
  status: StatusOportunidade;
  favorito: boolean;
  data_captura: string;
}
