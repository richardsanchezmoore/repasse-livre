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
  // Legenda de "Novos": 168h vira "7 dias"; senão "Xh".
  const legNovos = k.novosHoras >= 168 ? `${Math.round(k.novosHoras / 24)} dias` : `${k.novosHoras}h`;
  const cards = [
    { rotulo: `Ofertas mapeadas · ${k.mapeadasDias} dias`, valor: milhar(k.mapeados), Icone: Radar, title: `${milhar(k.mapeados)} anúncios varridos em ${k.mapeadasDias} dias (inclui os descartados)` },
    { rotulo: "Abaixo da FIPE", valor: milhar(k.abaixoFipe), Icone: Gem, title: `${milhar(k.abaixoFipe)} oportunidades ativas abaixo da tabela FIPE` },
    { rotulo: `Novos · últimas ${legNovos}`, valor: milhar(k.novos), Icone: Zap, title: `${milhar(k.novos)} novas oportunidades abaixo da FIPE nas últimas ${legNovos}` },
    { rotulo: `Economia de mercado · ${k.mapeadasDias} dias`, valor: economiaCompacta(k.economia), Icone: Banknote, title: `R$ ${milhar(Math.round(k.economia))} de ganho somado vs. FIPE nos anúncios dos últimos ${k.mapeadasDias} dias` },
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
