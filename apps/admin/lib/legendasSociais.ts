import { formatarMoeda } from "./formatadores";
import { urlOportunidade } from "./site";
import type { Oportunidade } from "./types";

/**
 * Conteúdo pronto pra colar nas redes sociais (Metricool/IG/TikTok) a partir de
 * uma oportunidade — pensado pro fluxo "abro no celular, copio, colo". Segue a
 * MESMA lógica das campanhas: legenda é TEMPLATE genérico (curiosidade/garimpo,
 * não foca no óbvio da imagem), variando só o nome do modelo + a margem no fim.
 * O operador escolhe A, B ou C e cola. Hashtags e link vêm separados (copiáveis
 * à parte) porque o WhatsApp/Metricool trata o link como campo próprio.
 */

export interface LegendaSocial {
  rotulo: string; // "A" | "B" | "C"
  texto: string;
}

export interface ConteudoSocial {
  titulo: string; // nome cheio do veículo (título do post)
  url: string; // link absoluto da página do carro (bio/post)
  hashtags: string; // 5 hashtags prontas
  legendas: LegendaSocial[];
}

/** "Chevrolet Tracker 2021 Ltz 1.2 Turbo Aut." → "Chevrolet Tracker 2021". */
export function nomeCurtoVeiculo(veiculo: string): string {
  const ateAno = veiculo.match(/^(.*?\b(?:19|20)\d{2}\b)/);
  if (ateAno) return ateAno[1].trim();
  return veiculo.split(/\s+/).slice(0, 3).join(" ");
}

/** Vira um token de hashtag sem acento/espaço/pontuação: "Porto Alegre" → "PortoAlegre". */
function tag(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove marcas de acento (combining diacritics)
    .replace(/[^a-zA-Z0-9]/g, "");
}

/** Margem "exata" (não arredonda pra cima): 13 → "13"; 13.4 → "13,4". */
function fmtMargem(m: number | null | undefined): string | null {
  if (m == null) return null;
  return Number.isInteger(m) ? String(m) : m.toFixed(1).replace(".", ",");
}

export function gerarConteudoSocial(op: Oportunidade): ConteudoSocial {
  const modelo = nomeCurtoVeiculo(op.veiculo);
  const margemStr = fmtMargem(op.margem_percentual);
  const abaixo = margemStr ? `${margemStr}% abaixo da FIPE` : "abaixo da FIPE";
  const ganho =
    op.fipe_valor != null && op.fipe_valor > op.preco ? formatarMoeda(op.fipe_valor - op.preco) : null;

  const legendas: LegendaSocial[] = [
    {
      rotulo: "A",
      texto: [
        "Como tem carro abaixo da FIPE todo dia? 🤔",
        "",
        "Não é sorte, é garimpo. A gente vasculha OLX, Mercado Livre e Facebook e mostra só os que valem a pena.",
        "",
        `Hoje tem esse ${modelo} — ${abaixo}. 👇`,
        "Quer ver os outros? Link na bio. 🔗",
      ].join("\n"),
    },
    {
      rotulo: "B",
      texto: [
        ganho ? `${ganho} de diferença pra tabela FIPE. E não, não é pegadinha. 👀` : `Muito abaixo da tabela FIPE. E não, não é pegadinha. 👀`,
        "",
        "Todo dia entram dezenas de carros assim — a gente garimpa e mostra só os reais, com a margem na tela.",
        "",
        `Esse ${modelo} tá ${abaixo}. Bora?`,
        "👉 Link na bio.",
      ].join("\n"),
    },
    {
      rotulo: "C",
      texto: [
        "Tem quem pague FIPE cheia. E tem quem usa a Repasse Livre. 😎",
        "",
        "Nossa plataforma varre o Brasil todo dia atrás de repasse de verdade — abaixo da FIPE, com o ganho já calculado pra você.",
        "",
        `Achado de hoje: ${modelo}, ${abaixo}. 🔥`,
        "👉 Link na bio pra ver mais.",
      ].join("\n"),
    },
  ];

  const cidadeTag = op.cidade ? `#${tag(op.cidade)}` : "#oportunidade";
  const ufTag = op.estado ? `#carros${tag(op.estado)}` : "#carrosusados";
  const hashtags = ["#repasse", "#carrosabaixodafipe", "#carrosusados", cidadeTag, ufTag].join(" ");

  return {
    titulo: op.veiculo,
    url: urlOportunidade(op),
    hashtags,
    legendas,
  };
}
