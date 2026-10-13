/**
 * ═══ O QUE NÃO É CARRO E ENTROU COMO SE FOSSE ═════════════════════════════
 *
 * ★★ ACHADO EM 13/10/2026 olhando a vitrine: pneu, bateria, centro de roda,
 * depósito de limpador, motor avulso, vitrine de açougue e DUAS LANCHAS Sea
 * Ray estavam publicados como veículo — com modelo normalizado e tudo. O
 * "Bateria Odyssey 1200" virou uma Honda Odyssey; a "Vitrina Carnicera ...
 * Vanguard" virou um Toyota Vanguard; o "Centro de llanta Land Cruiser J200"
 * virou um Land Cruiser.
 *
 * ⚠️⚠️ E O ESTRAGO NÃO É SÓ FEIO: o preço de um jogo de pneus entra na mediana
 * do modelo cujo nome ele cita. É contaminação da referência de preço, que é o
 * produto.
 *
 * ⚠️⚠️⚠️ O TIPO `ResultadoParseFacebook` JÁ DECLARAVA `motivoDescarte:
 * "nao_eh_veiculo"` — e NADA no código inteiro produzia ou consumia esse
 * valor. Mecanismo que o motor não chama não existe; é a terceira vez que isso
 * aparece neste projeto.
 *
 * ═══ POR QUE AS PISTAS SÃO ANCORADAS NO COMEÇO DO TÍTULO ═══
 *
 * ⚠️ A primeira versão que testei procurava a palavra em qualquer posição e
 * derrubava CARRO DE VERDADE: "Peugeot 2008 33.000 Kms Cubiertas Nuevas" é um
 * Peugeot com pneus novos, não um pneu. "Nissan X-trail 2019 De La Casa" é um
 * X-Trail de concessionária. O que separa um do outro é o SUJEITO do anúncio,
 * e o sujeito está no começo.
 *
 * ⚠️ O Facebook enfia o ANO no meio do título ("Motor Para 2015 Kia Rio"), mas
 * sempre depois do sujeito — por isso as expressões de duas palavras ainda
 * casam.
 *
 * ⚠️ Falso positivo aqui custa MAIS que falso negativo: esconder um carro real
 * é perder estoque em silêncio; deixar passar um pneu é uma linha feia que o
 * próximo olhar pega. Por isso a lista é curta e literal, não esperta.
 */

/**
 * Substantivo que, quando é o SUJEITO do anúncio, não é carro.
 *
 * ⚠️ Escrito como literal de regex e NÃO montado com `new RegExp("...")` a
 * partir de strings: montar por string exige dobrar cada barra invertida, e
 * foi exatamente assim que a primeira versão deste arquivo saiu quebrada —
 * `\s` virou `s` e o padrão passou a exigir a letra "s" onde devia aceitar
 * espaço. Nenhum dos doze casos de teste passou.
 */
const SUJEITO_NAO_VEICULO =
  /^(?:vendo|venta|oferta|remato|se\s+vende)?\s*(?:cubiertas?(?:\s+de)?|llantas?(?:\s+de)?|juego(?:\s+de)?|centro\s+de|bater[ií]as?|motor\s+para|caja\s+de\s+cambios?|repuestos?(?:\s+de)?|dep[oó]sito|parabrisas?|vitrina|aire\s+acondicionado|heladera|generador|tractor|remolque|casa\s+rodante|alquil(?:er|o))\b/i;

/**
 * ⚠️ Marcas de EMBARCAÇÃO. "Sea Ray" entrou duas vezes e o normalizador leu
 * "Ray" como modelo. Barco não tem como ser pego pela regra do sujeito, porque
 * o sujeito É o nome da marca — igualzinho a um carro.
 */
const MARCAS_NAUTICAS = /\b(sea\s*ray|bayliner|quicksilver|zodiac|lancha|bote\s+inflable|jet\s*ski|waverunner)\b/i;

export interface VereditoNaoVeiculo {
  ehNaoVeiculo: boolean;
  /** Para o log e para o livro `fb_vistos`. */
  motivo?: "peca_ou_acessorio" | "embarcacao" | "nao_e_venda";
}

export function conferirNaoEhVeiculo(titulo: string | null | undefined): VereditoNaoVeiculo {
  const t = String(titulo ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return { ehNaoVeiculo: false };

  if (MARCAS_NAUTICAS.test(t)) return { ehNaoVeiculo: true, motivo: "embarcacao" };

  const m = t.match(SUJEITO_NAO_VEICULO);
  if (m) {
    return { ehNaoVeiculo: true, motivo: /alquil/i.test(m[0]) ? "nao_e_venda" : "peca_ou_acessorio" };
  }
  return { ehNaoVeiculo: false };
}
