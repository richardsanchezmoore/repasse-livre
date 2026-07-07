// BIA Engine — tipos do fact-sheet. Um objeto por anúncio, computado por
// computarFactSheet(). Consumido por Copiloto / dashboard / notificações / API
// futura. Campos INTRÍNSECOS (só o anúncio) podem ser gravados; campos RELATIVOS
// à coorte são recalculados na leitura (mudam quando o mercado muda). Ver
// project_repasse_livre_copiloto_compra_instrumentacao.

/** Anúncio, só os campos que a engine usa (subconjunto de opportunities). */
export interface AnuncioBia {
  id: string;
  fipe_codigo: string | null;
  ano: string | null;
  estado: string | null;
  preco: number;
  fipe_valor: number | null;
  margem_percentual: number | null;
  km: number | null;
  data_captura: string;
  foto_principal: string | null;
  fotos_secundarias: string[] | null;
  descricao: string | null;
  atributos_olx: Record<string, { label: string; value: string }> | null;
}

/** Ponto do histórico de preço do próprio anúncio (anuncio_preco_log). */
export interface PontoPreco {
  preco: number;
  visto_em: string;
}

/** Origem do dado — a coluna de credibilidade do parecer técnico. */
export type OrigemDado = "Calculado" | "Benchmark interno" | "Snapshots" | "Anúncio" | "Base monitorada";

/** Uma evidência atômica: a matéria-prima do parecer e das estrelas. */
export interface Evidencia {
  chave: string;
  tipo: "positivo" | "alerta" | "neutro";
  texto: string;
  origem: OrigemDado;
  /** Peso pro score/estrelas (0–3). Alerta usa peso pra PENALIZAR. */
  peso: number;
}

/** Escopo da coorte usada (pra transparência do denominador). */
export interface EscopoCoorte {
  rotulo: string; // ex.: "no Brasil", "2023 em GO"
  tamanho: number;
}

/** Preço vs. mercado num escopo geográfico — pra aba Estado/Brasil da ficha.
 *  `melhorQue` = % dos anúncios do modelo (naquele escopo) que este preço supera. */
export interface MercadoEscopo {
  chave: "estado" | "brasil";
  rotulo: string; // "em SP" | "no Brasil"
  total: number;
  melhorQue: number; // 0–100
}

/** Linha do fichário técnico (parecer de analista): categoria → estrelas → origem. */
export interface FichaCategoria {
  categoria: string;
  /** 0–5; null = sem dado suficiente (mostra "N/D", honesto). */
  estrelas: number | null;
  origem: OrigemDado;
}

/** O fact-sheet — a saída da engine. */
export interface FactSheet {
  opportunity_id: string;
  calculado_em: string;
  /** 0–100: quão bom é o negócio (composto). */
  score: number | null;
  /** 0–100: quanto DADO sustenta a análise (cobertura), NÃO se o carro é bom. */
  grau_confianca: number;
  // ---- números crus (pra dashboard/API) ----
  percentual_fipe: number | null;
  percentual_mercado: number | null;
  percentil_desconto: number | null;
  km_percentil: number | null;
  indice_exclusividade: number | null;
  dias_monitorado: number;
  historico_reducoes: number;
  coorte: EscopoCoorte | null;
  // ---- saídas legíveis (o que o comprador lê) ----
  /** Veredito humano: "Excelente oportunidade" | "Boa oportunidade" | ... */
  classificacao: string;
  /** Frase-resumo instrutiva (por que, e a posição no ranking). */
  copiloto: string;
  /** Evidências de destaque em linguagem plana (os ✔ do parecer). */
  destaques: string[];
  fichas: FichaCategoria[];
  /** Preço vs. mercado por escopo (estado/Brasil) + escopo padrão — a aba da ficha. */
  mercado_escopos: MercadoEscopo[];
  mercado_padrao: string;
  /** Cru, pra uso interno/Premium (não exibido ao comprador comum). */
  evidencias: Evidencia[];
}
