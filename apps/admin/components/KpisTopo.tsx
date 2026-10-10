import { Radar, Gem, Zap, Banknote } from "lucide-react";
import { buscarKpisTopo } from "@/lib/kpisTopo";
import { PRACA_TEM_TABELA_PRONTA } from "@/lib/site";
import { t, IDIOMA_PADRAO, type Idioma } from "@/lib/idioma";

function milhar(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Economia compacta pro card ("R$ 20,2 mi"); o valor cheio vai no title. */
function economiaCompacta(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 10_000) return `R$ ${Math.round(v / 1000)} mil`;
  return `R$ ${milhar(Math.round(v))}`;
}

/**
 * Faixa de KPIs no topo do board — a vitrine da inteligência de mercado (o
 * produto). Server component: busca a RPC cacheada (lib/kpisTopo.ts) e mostra 4
 * números-chave do funil (mapeados → abaixo da FIPE → novos hoje → economia).
 */
/**
 * ⚠️ O idioma vem por PROP e não de `headers()`: este é um server component,
 * e ler cabeçalho dinamizaria a rota — o erro que já derrubou este app uma vez.
 * Quem passa é a página (`app/pt/page.tsx` manda "pt").
 */
export async function KpisTopo({ idioma = IDIOMA_PADRAO }: { idioma?: Idioma } = {}) {
  const tx = t(idioma);
  const k = await buscarKpisTopo();
  // Legenda de "Novos": 168h vira "7 dias"; senão "Xh".
  const legNovos = k.novosHoras >= 168 ? `${Math.round(k.novosHoras / 24)} ${tx("dias")}` : `${k.novosHoras}h`;
  /**
   * ⚠⚠ DOIS DESTES KPIs ERAM MENTIRA NO PARAGUAI — e um deles de um jeito
   * pior do que parecia:
   *
   *   • "Economia de mercado" soma `fipe_valor - preco`, e `fipe_valor` é NULO
   *     em 100% dos registros paraguaios. Mostrava "R$ 0" — em REAL, num site
   *     paraguaio.
   *   • "Abaixo da FIPE" não filtra FIPE nenhuma: a RPC devolve `count(*)` de
   *     tudo que não foi rejeitado (ver migration 0086). O NÚMERO estava certo,
   *     o RÓTULO é que mentia. Então ele não sai — passa a dizer o que é.
   *
   * ★ Por isso o Paraguai mostra TRÊS cartões e não quatro: um número a menos
   * é melhor do que um número falso. O quarto volta quando a NOSSA tabela de
   * referência estiver persistida — aí ele vira "modelos na tabela", que é o
   * número que realmente mede o produto.
   */
  const cards = [
    { rotulo: `${tx("ofertasMapeadas")} · ${k.mapeadasDias} ${tx("dias")}`, valor: milhar(k.mapeados), Icone: Radar, title: `${milhar(k.mapeados)} ${tx("kpiMapeadasAjuda")} · ${k.mapeadasDias} ${tx("dias")}` },
    PRACA_TEM_TABELA_PRONTA
      ? { rotulo: "Abaixo da FIPE", valor: milhar(k.abaixoFipe), Icone: Gem, title: `${milhar(k.abaixoFipe)} oportunidades ativas abaixo da tabela FIPE` }
      : { rotulo: tx("ofertasAtivas"), valor: milhar(k.abaixoFipe), Icone: Gem, title: `${milhar(k.abaixoFipe)} ${tx("kpiAtivasAjuda")}` },
    { rotulo: `${tx("novos")} · ${tx("ultimas")} ${legNovos}`, valor: milhar(k.novos), Icone: Zap, title: `${milhar(k.novos)} ${tx("kpiNovosAjuda")} · ${legNovos}` },
    ...(PRACA_TEM_TABELA_PRONTA
      ? [{ rotulo: `Economia de mercado · ${k.mapeadasDias} dias`, valor: economiaCompacta(k.economia), Icone: Banknote, title: `R$ ${milhar(Math.round(k.economia))} de ganho somado vs. FIPE nos anúncios dos últimos ${k.mapeadasDias} dias` }]
      : []),
  ];

  return (
    <div className="kpis-topo">
      {cards.map(({ rotulo, valor, Icone, title }) => (
        <div key={rotulo} className="kpi-card" title={title}>
          <div className="kpi-card-texto">
            <span className="kpi-card-rotulo">{rotulo}</span>
            <span className="kpi-card-valor">{valor}</span>
          </div>
          <span className="kpi-card-icone" aria-hidden>
            <Icone size={22} strokeWidth={2} />
          </span>
        </div>
      ))}
    </div>
  );
}
