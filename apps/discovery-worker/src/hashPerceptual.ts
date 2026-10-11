import sharp from "sharp";

/**
 * ═══ HASH PERCEPTUAL DE IMAGEM — "é a mesma foto?" ═══
 *
 * ★★★ POR QUE EXISTE (Gustavo, 11/10/2026): *"acho que é o mais correto, aliás
 * é como faz o Facebook, quando percebe mesma foto"*.
 *
 * O reanúncio me derrotou três vezes pelo texto. Igualdade exata erra por um
 * prefixo de ficha; continência erra quando a linha de contato muda no meio;
 * e semelhança de palavras fundiu um Corolla Runx PRETO com um VERMELHO, porque
 * a loja usa o mesmo template para carros diferentes.
 *
 * ★ Foto é EVIDÊNCIA, texto é indício. Dois anúncios com a mesma foto são o
 * mesmo carro — não há template que confunda isso.
 *
 * ═══ ⚠️⚠️ 256 BITS, E ISSO FOI MEDIDO — 64 NÃO SERVE ═══
 *
 * A primeira versão usava a grade clássica 8×8 (64 bits). O ensaio sobre 60
 * fotos reais da base reprovou:
 *
 *     grade    mesma foto reprocessada    piso entre carros DIFERENTES
 *     8×8      até 8                      8      ← vão ZERO
 *     16×16    até 34                     64     ← 30 bits de folga
 *
 * ★ O motivo não é hash ruim, é o ACERVO: metade das fotos é de showroom,
 * com a mesma composição — carro centralizado, piso claro, faixa escura ao
 * fundo. Um Ford Mustang e um Mercedes C300 davam distância 8, igualzinho a
 * uma foto recomprimida. Em 64 bits o dHash guarda COMPOSIÇÃO; só com 256
 * ele passa a guardar o carro.
 *
 * ⚠️ E os hashes colidentes NÃO eram degenerados (30-39 bits ligados de 64,
 * bem equilibrados) — então não adiantaria filtrar imagem “sem informação”.
 * Faltava resolução mesmo.
 *
 * ═══ dHash (difference hash), e por que este e não outro ═══
 *
 * Reduz a imagem a 17×16 em cinza e compara cada pixel com o vizinho da direita:
 * 16 comparações × 16 linhas = 256 bits. O que ele guarda é o GRADIENTE,
 * não o brilho — então sobrevive a recompressão, redimensionamento e mudança de
 * exposição, que é exatamente o que o Facebook faz com toda imagem que sobe.
 *
 * ⚠️ NÃO sobrevive a recorte, rotação nem adesivo grande colado por cima — e
 * loja paraguaia cola selo de preço. Nesses casos ele falha e o critério de
 * texto continua valendo atrás. Um não substitui o outro.
 *
 * ⚠️ CUSTO: ~5-15 ms por imagem. O caro é BAIXAR a foto, e isso já pagamos para
 * re-hospedar — o hash entra em cima de bytes que já estão na memória. É por
 * isso que dá para fazer: não acrescenta rede nenhuma.
 */

/** 64 bits em 16 caracteres hex. */
/** 256 bits em 64 caracteres hex. */
export type HashFoto = string;

/** ⚠️ 17×16: a coluna extra é o que permite 16 comparações por linha. */
const LADO = 16;
const LARGURA = LADO + 1;
const ALTURA = LADO;

/**
 * Calcula o dHash de uma imagem já em memória.
 *
 * ⚠️ Devolve null em vez de lançar: imagem corrompida, formato exótico ou
 * buffer truncado não podem derrubar uma captura. Sem hash a gente perde um
 * critério de duplicata, não o anúncio.
 */
export async function hashDaImagem(bytes: Buffer): Promise<HashFoto | null> {
  try {
    const px = await sharp(bytes)
      // ⚠️ `rotate()` aplica a orientação do EXIF ANTES de reduzir. Sem isso, a
      // mesma foto enviada de um celular e de um desktop daria hashes
      // diferentes só porque uma vem deitada com a flag de rotação.
      .rotate()
      .greyscale()
      // `fit: "fill"` de propósito: queremos SEMPRE 9×8, mesmo distorcendo. Se
      // respeitasse proporção, a mesma foto recortada em formatos diferentes
      // produziria grades de tamanhos diferentes e nada compararia.
      .resize(LARGURA, ALTURA, { fit: "fill" })
      .raw()
      .toBuffer();

    if (px.length < LARGURA * ALTURA) return null;

    let bits = "";
    for (let y = 0; y < ALTURA; y++) {
      for (let x = 0; x < LARGURA - 1; x++) {
        const i = y * LARGURA + x;
        bits += px[i] < px[i + 1] ? "1" : "0";
      }
    }

    // 256 bits → 64 hex.
    let hex = "";
    for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch {
    return null;
  }
}

/**
 * Distância de Hamming entre dois hashes: quantos dos 64 bits diferem.
 *
 * ⚠️ Devolve 256 (o máximo, ou seja "nada a ver") quando um dos dois é inválido.
 * Falhar para "diferente" é o lado seguro: duplicata não detectada mostra um
 * card repetido; falso positivo esconde um carro real.
 */
export const BITS = LADO * LADO;

/**
 * ⚠⚠ O SENTINELA DE “NÃO SEI”, e ele NÃO significa “muito diferente”.
 *
 * `distancia` devolve o máximo quando falta hash de um dos lados. Para o
 * casamento isso é o certo (falha para “diferente”, que é o lado seguro), mas
 * para DIAGNÓSTICO engana — eu mesmo li “256 de 256” como “carros diferentes” e
 * quase dei um veredito sobre dois anúncios que simplesmente não tinham foto.
 *
 * Duas imagens REAIS sem relação ficam perto de 128 (metade dos bits), medido:
 * 117–131 num grupo de Ractis distintos. Chegar a 256 é inverter TODOS os bits,
 * o que não acontece com foto de verdade.
 */
export const DISTANCIA_DESCONHECIDA = BITS;
export const HEX = BITS / 4;

export function distancia(a: HashFoto | null | undefined, b: HashFoto | null | undefined): number {
  if (!a || !b || a.length !== HEX || b.length !== HEX) return BITS;
  let d = 0;
  for (let i = 0; i < HEX; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    if (Number.isNaN(x)) return BITS;
    // popcount de 4 bits
    d += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return d;
}

/**
 * ★★ O LIMIAR. Abaixo disto, mesma foto.
 *
 * ⚠️ 40 de 256 (≈16%) NÃO é um número escolhido por ser redondo — sai da
 * medição acima. O pior caso de reprocessamento foi 34 (webp q60) e o piso
 * entre carros diferentes foi 64. 40 fica 6 acima do pior reprocessamento e
 * 24 abaixo do piso.
 *
 * ⚠️ E fica DELIBERADAMENTE mais perto do lado do reprocessamento, não no
 * meio do vão: errar para "diferente" mostra um card repetido, que o usuário
 * vê; errar para "igual" esconde um carro real, que ninguém percebe.
 *
 * ⚠️⚠️ O custo dos dois erros não é simétrico — mesma razão que me fez rejeitar
 * a semelhança de texto. Na dúvida, dois cards.
 */
export const LIMIAR_MESMA_FOTO = 40;

export const mesmaFoto = (a: HashFoto | null | undefined, b: HashFoto | null | undefined): boolean =>
  distancia(a, b) <= LIMIAR_MESMA_FOTO;
