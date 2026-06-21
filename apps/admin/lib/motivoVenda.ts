export const MOTIVOS_VENDA = [
  "liquidez_imediata",
  "troca_veiculo",
  "ja_tenho_outro",
  "encomendei_zero",
  "encerramento_atividade",
  "outro",
] as const;

export type MotivoVenda = (typeof MOTIVOS_VENDA)[number];

export const ROTULO_MOTIVO_VENDA: Record<MotivoVenda, string> = {
  liquidez_imediata: "Liquidez imediata",
  troca_veiculo: "Troca de veículo",
  ja_tenho_outro: "Já tenho outro",
  encomendei_zero: "Encomendei um zero",
  encerramento_atividade: "Encerramento de atividade",
  outro: "Outro",
};
