"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { corDaMarca } from "@/lib/biaCores";
import { gerarInsightTendencia } from "@/lib/insightTendencia";
import type { ItemTendenciaDestaque, PontoTendenciaMensal } from "@/lib/biaDashboard";

const COR_BORDA_GRAFICO = "#222838";
const COR_TEXTO_FRACO_GRAFICO = "#7b8395";
const COR_MARGEM = "oklch(0.7 0.15 230)";
const COR_VOLUME = "oklch(0.7 0.15 155)";

const ESTILO_TOOLTIP = {
  contentStyle: {
    background: "#161a23",
    border: `1px solid ${COR_BORDA_GRAFICO}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 12,
  },
  labelStyle: { color: "#eef1f6", fontWeight: 700 },
};

function formatarMesCurto(mesIso: string): string {
  const [ano, mes] = mesIso.split("-");
  return `${mes}/${ano.slice(2)}`;
}

export function BiaTendencias({
  tendenciaMensal,
  destaques,
}: {
  tendenciaMensal: PontoTendenciaMensal[];
  destaques: ItemTendenciaDestaque[];
}) {
  const modelos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const ponto of tendenciaMensal) {
      mapa.set(`${ponto.marca}|${ponto.modelo}`, `${ponto.marca} ${ponto.modelo}`);
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tendenciaMensal]);

  const [chaveSelecionada, setChaveSelecionada] = useState(modelos[0]?.[0] ?? "");

  const serie = useMemo(() => {
    if (!chaveSelecionada) return [];
    const [marca, modelo] = chaveSelecionada.split("|");
    return tendenciaMensal
      .filter((ponto) => ponto.marca === marca && ponto.modelo === modelo)
      .map((ponto) => ({
        mes: ponto.mes,
        margemMedia: ponto.margemMedia,
        quantidadeMedia: ponto.quantidadeMedia,
      }));
  }, [tendenciaMensal, chaveSelecionada]);

  return (
    <div className="bia-painel">
      <section className="bia2-secao">
        <div className="bia2-secao-cabecalho">
          <h2 className="bia2-titulo-secao">Série por modelo</h2>
          <select
            className="bia2-toggle"
            value={chaveSelecionada}
            onChange={(evento) => setChaveSelecionada(evento.target.value)}
          >
            {modelos.map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        {serie.length === 0 ? (
          <div className="bia2-card">
            <div className="bia2-painel-hover-vazio">Ainda não há histórico suficiente pra esse modelo.</div>
          </div>
        ) : (
          <div className="bia2-card" style={{ marginTop: 18 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COR_BORDA_GRAFICO} />
                <XAxis dataKey="mes" tickFormatter={formatarMesCurto} fontSize={11} stroke={COR_TEXTO_FRACO_GRAFICO} />
                <YAxis yAxisId="margem" fontSize={11} stroke={COR_TEXTO_FRACO_GRAFICO} width={50} />
                <YAxis yAxisId="volume" orientation="right" fontSize={11} stroke={COR_TEXTO_FRACO_GRAFICO} width={50} />
                <Tooltip labelFormatter={(valor) => formatarMesCurto(String(valor))} {...ESTILO_TOOLTIP} />
                <Line
                  yAxisId="margem"
                  type="monotone"
                  dataKey="margemMedia"
                  name="Margem média (%)"
                  stroke={COR_MARGEM}
                  strokeWidth={2}
                  dot
                />
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="quantidadeMedia"
                  name="Volume médio diário"
                  stroke={COR_VOLUME}
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bia2-secao">
        <h2 className="bia2-titulo-secao">Maiores variações do mês</h2>
        {destaques.length === 0 ? (
          <div className="bia2-card">
            <div className="bia2-painel-hover-vazio">
              Ainda não há dois meses completos de histórico pra comparar.
            </div>
          </div>
        ) : (
          <div className="bia2-card bia2-cidades-lista">
            {destaques.map((item) => (
              <div key={`${item.marca}-${item.modelo}`} className="bia2-cidade-linha">
                <div className="bia2-cidade-nome-grupo">
                  <span className="bia2-chip-ponto" style={{ background: corDaMarca(item.marca) }} />
                  <span className="bia2-cidade-nome">{gerarInsightTendencia(item)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
