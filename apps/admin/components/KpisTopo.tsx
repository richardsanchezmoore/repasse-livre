import { Radar, Table2, Clock } from "lucide-react";
import { buscarKpisTopo } from "@/lib/kpisTopo";
import { buscarTabelaReferencia } from "@/lib/tabelaReferencia";
import { t, IDIOMA_PADRAO, type Idioma } from "@/lib/idioma";

function milhar(n: number): string {
  return n.toLocaleString("es-PY");
}

/**
 * A FAIXA DO TOPO — deixou de ser painel de números e virou a PROMESSA do site.
 *
 * ★★ Ideia do Gustavo (11/10/2026): *"estava a pensar no que destacar nos KPI e
 * acho que devemos usar eles como banner de promoção do nosso portal"*. Está
 * certo: quem chega pela primeira vez não sabe o que é este site, e três
 * números sem contexto não contam.
 *
 * ★ MAS CADA CARTÃO MANTÉM UM NÚMERO REAL. Promessa sem número é propaganda;
 * número sem promessa não diz o que o site faz. Os dois juntos é que
 * convencem — e o número é o que nos separa do Carden, que publica "média" sem
 * dizer de quantos anúncios.
 *
 * ═══ ⚠️⚠️ O QUE EU TIVE QUE DERRUBAR DAS SUGESTÕES, E POR QUÊ ═══
 *
 * Ele sugeriu quatro frases. Duas não se sustentam no dado de hoje — medido em
 * 11/10/2026 — e publicar promessa que não se cumpre custa mais do que a
 * promessa rende:
 *
 *   ✗ "anúncios de particulares": 0% da base está marcada como profissional,
 *     40% como particular e 60% é NULO. O campo não está detectando loja — e
 *     nós SABEMOS que há lojas, porque a varredura de reanúncio achou lojistas
 *     republicando o mesmo carro dez vezes com template próprio. O primeiro
 *     lojista a se ver listado desmente a frase.
 *
 *   ✗ "em todo o Paraguai": são 12 cidades, as praças que varremos. "Todo o
 *     país" é verificável em dois cliques.
 *
 *   ✗ "a PRIMEIRA tabela com base real": não dá para provar primazia, e o
 *     Carden existe. O diferencial verdadeiro é COMO a nossa é feita (mediana
 *     sobre anúncios reais, com faixa visível) — isso a página /tabla explica.
 *
 * ★ O que sobrou é tudo verificável: quantos entraram, que o monitoramento não
 * para, e quantos modelos já têm preço de referência publicado.
 */
export async function KpisTopo({ idioma = IDIOMA_PADRAO }: { idioma?: Idioma } = {}) {
  const tx = t(idioma);
  const [k, tabela] = await Promise.all([buscarKpisTopo(), buscarTabelaReferencia()]);

  // ⚠️ Modelos DISTINTOS, não linhas: a tabela tem linha por ano e por geração,
  // então contar linhas inflaria o número sem significar mais cobertura.
  const modelos = new Set(tabela.map((l) => `${l.marca ?? ""}|${l.modelo}`)).size;

  const cards = [
    {
      Icone: Clock,
      valor: milhar(k.novos),
      rotulo: tx("kpiNovosRotulo"),
      frase: tx("kpiNovosFrase"),
    },
    {
      Icone: Radar,
      valor: "24/7",
      rotulo: tx("kpiMonitorRotulo"),
      frase: tx("kpiMonitorFrase"),
    },
    {
      Icone: Table2,
      valor: milhar(modelos),
      rotulo: tx("kpiTabelaRotulo"),
      frase: tx("kpiTabelaFrase"),
    },
  ];

  return (
    <div className="kpis-topo">
      {cards.map(({ rotulo, valor, frase, Icone }) => (
        <div key={rotulo} className="kpi-card">
          <div className="kpi-card-texto">
            <span className="kpi-card-valor">{valor}</span>
            <span className="kpi-card-rotulo">{rotulo}</span>
            <span className="kpi-card-frase">{frase}</span>
          </div>
          <span className="kpi-card-icone" aria-hidden>
            <Icone size={22} strokeWidth={2} />
          </span>
        </div>
      ))}
    </div>
  );
}
