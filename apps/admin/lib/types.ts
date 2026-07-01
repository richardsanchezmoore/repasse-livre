import type { PerfilRemetente } from "./perfilRemetente";
import type { MotivoVenda } from "./motivoVenda";

export type StatusOportunidade = "descoberta" | "aprovada" | "rejeitada" | "enviada" | "favoritada";
export type OrigemTipo = "descoberta" | "insercao_direta";

export interface Oportunidade {
  id: string;
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
  fipe_valor: number | null;
  fipe_codigo: string | null;
  fipe_data_referencia: string | null;
  margem_percentual: number | null;
  classificacao: string | null;
  foto_principal: string | null;
  fotos_secundarias: string[];
  status: StatusOportunidade;
  origem_tipo: OrigemTipo;
  whatsapp: string | null;
  nome_remetente: string | null;
  perfil_remetente: PerfilRemetente | null;
  motivo_venda: MotivoVenda | null;
  opcionais: string[];
  sinistro_leilao: string[];
  descricao: string | null;
  favorito: boolean;
  data_captura: string;
  data_publicacao_origem: string | null;
  atributos_olx: Record<string, { label: string; value: string }>;
  anunciante_profissional: boolean | null;
}
