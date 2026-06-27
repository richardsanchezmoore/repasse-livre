const REGEX_OLX = /^(https:\/\/img\.olx\.com\.br)\/images\/(\d+\/\d+)\.\w+$/;
const REGEX_INSERCAO_DIRETA = /^(https:\/\/[^/]+\/storage\/v1\/object\/public\/oportunidades-fotos\/)([0-9a-f-]+)\.jpg$/i;

/**
 * A URL salva em `foto_principal`/`fotos_secundarias` é sempre a versão
 * "cheia" da foto — boa pra exibição grande, mas pesada demais pra um card
 * de listagem ou grade de miniaturas. Duas origens diferentes, dois jeitos
 * de chegar no thumbnail:
 * - OLX: o próprio CDN serve um thumbnail mais leve só trocando o segmento
 *   `/images/` por `/thumbsWxH/` e a extensão por `.webp` (mesmo `id`).
 * - Inserção direta: a API de upload (`app/api/fotos/route.ts`) já grava um
 *   `{id}-thumb.webp` ao lado do `{id}.jpg` original no bucket — só precisa
 *   trocar o nome do arquivo. Fotos enviadas antes dessa mudança não têm
 *   esse arquivo companheiro; o `onError` no `<img>` (`OpportunityCard`/
 *   `GaleriaFotos`) cai de volta pro original nesse caso.
 */
export function urlThumbnailOlx(url: string, largura = 700, altura = 500): string {
  const matchOlx = url.match(REGEX_OLX);
  if (matchOlx) {
    return `${matchOlx[1]}/thumbs${largura}x${altura}/${matchOlx[2]}.webp`;
  }

  const matchInsercaoDireta = url.match(REGEX_INSERCAO_DIRETA);
  if (matchInsercaoDireta) {
    return `${matchInsercaoDireta[1]}${matchInsercaoDireta[2]}-thumb.webp`;
  }

  return url;
}
