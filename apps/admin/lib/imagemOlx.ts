/**
 * A URL salva em `foto_principal`/`fotos_secundarias` é a versão "original"
 * da OLX (`img.olx.com.br/images/{dir}/{id}.jpg`, full size) — boa pra
 * exibição grande, mas pesada demais pra um card de listagem. A própria OLX
 * serve um thumbnail bem mais leve pelo mesmo CDN, só trocando o segmento
 * `/images/` por `/thumbsWxH/` e a extensão por `.webp` (mesmo `id`,
 * mesma pasta). Anúncios de inserção direta (fotos hospedadas em outro
 * domínio) não seguem esse padrão e ficam inalterados.
 */
export function urlThumbnailOlx(url: string, largura = 700, altura = 500): string {
  const match = url.match(/^(https:\/\/img\.olx\.com\.br)\/images\/(\d+\/\d+)\.\w+$/);
  if (!match) return url;
  return `${match[1]}/thumbs${largura}x${altura}/${match[2]}.webp`;
}
