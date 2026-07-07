import { Radar, Gem, Zap, Banknote } from "lucide-react";
import { buscarKpisTopo } from "@/lib/kpisTopo";

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
export async function KpisTopo() {
  const k = await buscarKpisTopo();
  const cards = [
    { rotulo: "Ofertas mapeadas · 7 dias", valor: milhar(k.mapeados7d), Icone: Radar, title: `${milhar(k.mapeados7d)} anúncios varridos em 7 dias (inclui os descartados)` },
    { rotulo: "Abaixo da FIPE", valor: milhar(k.abaixoFipe), Icone: Gem, title: `${milhar(k.abaixoFipe)} oportunidades ativas abaixo da tabela FIPE` },
    { rotulo: "Novos · últimas 24h", valor: milhar(k.novos24h), Icone: Zap, title: `${milhar(k.novos24h)} novas oportunidades abaixo da FIPE nas últimas 24h` },
    { rotulo: "Economia de mercado · 7 dias", valor: economiaCompacta(k.economia7d), Icone: Banknote, title: `R$ ${milhar(Math.round(k.economia7d))} de ganho somado vs. FIPE nos anúncios dos últimos 7 dias` },
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
