"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Scale, LineChart, Compass } from "lucide-react";
import { HistoricoPrecos } from "./HistoricoPrecos";
import { ReferenciaPreco } from "./ReferenciaPreco";
import { FichaBia } from "./FichaBia";
import type { PontoHistoricoFipe } from "@/lib/fipeHistorico";
import type { ReferenciaPreco as Referencia } from "@/lib/referenciaPreco";
import type { FactSheet } from "@/lib/bia/tipos";

type AbaId = "referencia" | "copiloto" | "historico";

/**
 * Painel de abas da página individual: "Preços de referência", "Análise do
 * Copiloto" (item nobre do plano pago — antes ficava largado no rodapé) e
 * "Histórico FIPE". Abas em qualquer largura (só o painel ativo aparece); labels
 * curtos p/ caber 3 no mobile. A ordem é sempre Referência → Copiloto → Histórico,
 * e cada aba só existe se tiver dado. Se sobra um só, ele ocupa tudo sem abas.
 * Ver project_repasse_livre_referencia_preco_plataforma e o copiloto.
 */
export function PainelComparativo({
  historico,
  referencia,
  precoAnuncio,
  copiloto = null,
}: {
  historico: PontoHistoricoFipe[];
  referencia: Referencia | null;
  precoAnuncio: number;
  copiloto?: FactSheet | null;
}) {
  const temReferencia = referencia !== null;
  const temCopiloto = copiloto !== null;
  const temHistorico = historico.length >= 2;

  const abaInicial: AbaId = temReferencia ? "referencia" : temCopiloto ? "copiloto" : "historico";
  const [aba, setAba] = useState<AbaId>(abaInicial);

  const abas: { id: AbaId; label: string; Icone: typeof Scale; conteudo: ReactNode }[] = [];
  if (temReferencia) {
    abas.push({
      id: "referencia",
      label: "Preços Ref.ª",
      Icone: Scale,
      conteudo: <ReferenciaPreco referencia={referencia!} precoAnuncio={precoAnuncio} />,
    });
  }
  if (temCopiloto) {
    abas.push({ id: "copiloto", label: "Copiloto", Icone: Compass, conteudo: <FichaBia fs={copiloto!} /> });
  }
  if (temHistorico) {
    abas.push({ id: "historico", label: "Hist. FIPE", Icone: LineChart, conteudo: <HistoricoPrecos serie={historico} /> });
  }

  if (abas.length === 0) return null;
  if (abas.length === 1) return <>{abas[0].conteudo}</>;

  // abaInicial já aponta pro 1º presente; guarda contra um id que saiu da lista.
  const abaAtiva = abas.some((a) => a.id === aba) ? aba : abas[0].id;

  return (
    <div className="painel-comparativo">
      <div className="painel-comparativo-abas" role="tablist">
        {abas.map(({ id, label, Icone }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={abaAtiva === id}
            className={`painel-comparativo-aba${abaAtiva === id ? " painel-comparativo-aba-ativa" : ""}`}
            onClick={() => setAba(id)}
          >
            <Icone className="painel-comparativo-aba-icone" size={15} strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {abas.map(({ id, conteudo }) => (
        <div key={id} className="painel-comparativo-item" data-ativo={abaAtiva === id}>
          {conteudo}
        </div>
      ))}
    </div>
  );
}
