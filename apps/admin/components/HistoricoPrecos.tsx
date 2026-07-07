"use client";

import { useState } from "react";
import { Area, AreaChart, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { PontoHistoricoFipe } from "@/lib/fipeHistorico";

/**
 * Gráfico "Histórico de Preços" da página individual — variação da FIPE do
 * modelo ao longo dos meses, com seletor de período (3/6 meses/1 ano),
 * default 6. Recebe a série pronta por props (ver lib/fipeHistorico.ts,
 * server-only). Ver project_repasse_livre_fipe_historico (Bloco C).
 */

const PERIODOS = [
  { valor: 3, rotulo: "3 meses" },
  { valor: 6, rotulo: "6 meses" },
  { valor: 12, rotulo: "1 ano" },
] as const;

const COR_LINHA = "#1a1f2e";
const COR_VERDE = "#16a34a";
const COR_VERMELHO = "#dc2626";

function formatarReais(valor: number): string {
  return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
}

export function HistoricoPrecos({ serie }: { serie: PontoHistoricoFipe[] }) {
  const [meses, setMeses] = useState<number>(6);

  const dados = serie.slice(-meses);
  if (dados.length < 2) return null;

  const primeiro = dados[0].valor;
  const ultimo = dados[dados.length - 1].valor;
  const variacaoPct = ((ultimo - primeiro) / primeiro) * 100;
  const subiu = variacaoPct >= 0;
  const corVariacao = Math.abs(variacaoPct) < 0.05 ? "#6b7280" : subiu ? COR_VERDE : COR_VERMELHO;

  return (
    <section className="historico-precos">
      <div className="historico-precos-cabecalho">
        <div>
          <h2 className="historico-precos-titulo">Histórico Preços FIPE</h2>
          <p className="historico-precos-variacao" style={{ color: corVariacao }}>
            {subiu ? "▲" : "▼"} {Math.abs(variacaoPct).toFixed(1)}%{" "}
            <span className="historico-precos-variacao-periodo">
              {meses === 12 ? "em 1 ano" : `em ${meses} meses`}
            </span>
          </p>
        </div>
        <select
          className="historico-precos-select"
          value={meses}
          onChange={(evento) => setMeses(Number(evento.target.value))}
          aria-label="Período do histórico"
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        {/* Margem lateral folgada (40) pros rótulos de valor dos pontos das
            EXTREMIDADES não serem cortados pela borda do gráfico. */}
        <AreaChart data={dados} margin={{ top: 24, right: 40, left: 40, bottom: 4 }}>
          <defs>
            <linearGradient id="gradienteHistoricoFipe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_VERDE} stopOpacity={0.14} />
              <stop offset="100%" stopColor={COR_VERDE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="rotulo"
            fontSize={11}
            stroke="#9aa2b1"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["dataMin - dataMin * 0.02", "dataMax + dataMax * 0.02"]} />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={COR_LINHA}
            strokeWidth={2}
            fill="url(#gradienteHistoricoFipe)"
            dot={{ r: 3, fill: "#fff", stroke: COR_LINHA, strokeWidth: 2 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="valor"
              position="top"
              offset={10}
              fontSize={11}
              fill="#4b5563"
              formatter={(v) => (v == null ? "" : formatarReais(Number(v)))}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
