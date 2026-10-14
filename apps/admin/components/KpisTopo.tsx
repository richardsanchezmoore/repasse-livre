import Link from "next/link";
import { Radar, Table2, Clock, MapPin, ArrowRight } from "lucide-react";
import { buscarKpisTopo, buscarCidadesCobertas } from "@/lib/kpisTopo";
import { buscarTabelaReferencia } from "@/lib/tabelaReferencia";
import { t, IDIOMA_PADRAO, type Idioma } from "@/lib/idioma";

function milhar(n: number): string {
  return n.toLocaleString("es-PY");
}

/**
 * A FAIXA DO TOPO — banner de valor, não painel de números.
 *
 * ★★ Ideia do Gustavo: *"devemos usar eles como banner de promoção do nosso
 * portal"*. Mas cada cartão mantém um NÚMERO REAL: promessa sem número é
 * propaganda, número sem promessa não conta a quem chega o que o site faz.
 *
 * ⚠️⚠️ DUAS FRASES SUGERIDAS FORAM DERRUBADAS PELO DADO (11/10/2026), porque
 * promessa que o primeiro visitante desmente custa mais do que rende:
 *   ✗ "anúncios de particulares" — 0% da base marcada como profissional, 60%
 *     NULO, e sabemos que há lojas (a varredura achou lojista republicando o
 *     mesmo carro dez vezes com template próprio);
 *   ✗ "em todo o Paraguai" — são 12 cidades, as praças que varremos.
 *
 * ★ "Tabela viva, atualizada todo mês" FICA, e é dele: é verdade literal — a
 * tabela é datada por mês como a FIPE e republica de hora em hora.
 */
export async function KpisTopo({ idioma = IDIOMA_PADRAO }: { idioma?: Idioma } = {}) {
  const tx = t(idioma);
  const [k, tabela, cidades] = await Promise.all([buscarKpisTopo(), buscarTabelaReferencia(), buscarCidadesCobertas()]);

  // ⚠️ Modelos DISTINTOS, não linhas: a tabela tem linha por ano e por geração,
  // então contar linhas inflaria o número sem significar mais cobertura.
  const modelos = new Set(tabela.map((l) => `${l.marca ?? ""}|${l.modelo}`)).size;

  return (
    <div className="kpis-topo">
      {/* ★★★ O CARTÃO DA TABELA VEM PRIMEIRO, e é o único clicável.
          Pedido dele: *"podemos publicar um banner para um KPI que leve a
          tabela de consulta... na versão do celular deve ser o primeiro"*.
          Está em primeiro no DESKTOP também — a tabela é o produto, e os
          outros dois cartões existem para dar credibilidade a ela. */}
      <Link href="/tabla" className="kpi-card kpi-card-cta">
        <div className="kpi-card-texto">
          <span className="kpi-card-valor">{milhar(modelos)}</span>
          <span className="kpi-card-rotulo">{tx("kpiTabelaCtaRotulo")}</span>
          <span className="kpi-card-frase">{tx("kpiTabelaCtaFrase")}</span>
          <span className="kpi-card-acao">
            {tx("kpiTabelaCta")} <ArrowRight size={13} strokeWidth={2.6} />
          </span>
        </div>
        <span className="kpi-card-icone" aria-hidden>
          <Table2 size={22} strokeWidth={2} />
        </span>
      </Link>

      <div className="kpi-card">
        <div className="kpi-card-texto">
          <span className="kpi-card-valor">{milhar(k.novos)}</span>
          <span className="kpi-card-rotulo">{tx("kpiNovosRotulo")}</span>
          <span className="kpi-card-frase">{tx("kpiNovosFrase")}</span>
        </div>
        <span className="kpi-card-icone" aria-hidden>
          <Clock size={22} strokeWidth={2} />
        </span>
      </div>

      <div className="kpi-card">
        <div className="kpi-card-texto">
          <span className="kpi-card-valor">24/7</span>
          <span className="kpi-card-rotulo">{tx("kpiMonitorRotulo")}</span>
          <span className="kpi-card-frase">{tx("kpiMonitorFrase")}</span>
        </div>
        <span className="kpi-card-icone" aria-hidden>
          <Radar size={22} strokeWidth={2} />
        </span>
      </div>

      {/* ★ O quarto cartao emparelha a grade (ela ja era repeat(4,1fr) com tres
          cartoes esticados) e diz o numero que substitui a frase reprovada
          "em todo o Paraguai" — ver lib/kpisTopo. */}
      <div className="kpi-card">
        <div className="kpi-card-texto">
          <span className="kpi-card-valor">{milhar(cidades)}</span>
          <span className="kpi-card-rotulo">{tx("kpiCidadesRotulo")}</span>
          <span className="kpi-card-frase">{tx("kpiCidadesFrase")}</span>
        </div>
        <span className="kpi-card-icone" aria-hidden>
          <MapPin size={22} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}
