import type { AnuncioBia } from "./tipos";

/**
 * Coorte = o grupo de comparação de um anúncio ("os mesmos carros"). O UNIVERSO
 * (todos os anúncios ativos com o mesmo fipe_codigo, qualquer ano/região) é
 * carregado UMA vez por anúncio; montarCoorte apenas FILTRA esse universo em
 * memória, subindo a escada de alargamento até bater o mínimo do indicador.
 *
 * Duas métricas, dois agrupamentos:
 *  - "desconto" (% abaixo da FIPE): a FIPE normaliza ano/idade, então dá pra
 *    comparar entre ANOS (mais amostra). Escada: estado → Brasil.
 *  - "preco" (R$ absoluto): só compara mesmo ANO (preço muda com o ano). Escada:
 *    ano+estado → ano+Brasil → Brasil (qualquer ano, último recurso).
 *
 * `suficiente=false` quando nem o nível mais amplo bate o mínimo → o indicador
 * que pediu essa coorte NÃO nasce (gate). Ver validação: ~69% dos anúncios estão
 * em coortes <5 no nível trim+ano; a escada é o que salva a cobertura.
 */
export interface Coorte {
  itens: AnuncioBia[];
  escopo: string;
  tamanho: number;
  suficiente: boolean;
}

interface NivelEscada {
  rotulo: string;
  filtro: (a: AnuncioBia) => boolean;
}

function escada(anuncio: AnuncioBia, metrica: "desconto" | "preco"): NivelEscada[] {
  const mesmoEstado = (a: AnuncioBia) => a.estado != null && a.estado === anuncio.estado;
  const mesmoAno = (a: AnuncioBia) => a.ano != null && a.ano === anuncio.ano;
  const uf = anuncio.estado ?? "sua região";
  const ano = anuncio.ano ?? "";

  if (metrica === "desconto") {
    return [
      { rotulo: `em ${uf}`, filtro: mesmoEstado },
      { rotulo: "no Brasil", filtro: () => true },
    ];
  }
  // Preço absoluto NÃO cruza anos (2024 vs 2025 é maçã com laranja). Se nem
  // ano+Brasil bate o mínimo, o indicador de preço se cala (o percentil de
  // DESCONTO, que é amplo no ano, ainda carrega a mensagem de "bom negócio").
  return [
    { rotulo: `${ano} em ${uf}`, filtro: (a) => mesmoAno(a) && mesmoEstado(a) },
    { rotulo: `${ano} no Brasil`, filtro: mesmoAno },
  ];
}

export function montarCoorte(
  universo: AnuncioBia[],
  anuncio: AnuncioBia,
  opts: { metrica: "desconto" | "preco"; minimo: number }
): Coorte {
  let maisAmpla: Coorte | null = null;
  for (const nivel of escada(anuncio, opts.metrica)) {
    const itens = universo.filter(nivel.filtro);
    const coorte: Coorte = {
      itens,
      escopo: nivel.rotulo,
      tamanho: itens.length,
      suficiente: itens.length >= opts.minimo,
    };
    maisAmpla = coorte;
    if (coorte.suficiente) return coorte; // primeiro nível que basta
  }
  return maisAmpla ?? { itens: [], escopo: "—", tamanho: 0, suficiente: false };
}
