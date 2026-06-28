"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarKm, formatarMoeda } from "@/lib/formatadores";
import type {
  ItemCidadeAtiva,
  ItemDisputado,
  ItemEstadoAtivo,
  ItemMarcaLuxo,
  PontoSerie,
  PontoValor,
  ResumoBia,
} from "@/lib/biaDashboard";

const COR_VERDE = "#22c55e";
const COR_TEXTO_FRACO = "#8a8a8a";
const COR_BORDA = "#262626";

const PALETA = ["#22c55e", "#06b6d4", "#f97316", "#a855f7", "#f43f5e", "#eab308", "#3b82f6", "#14b8a6"];

function corPorIndice(indice: number): string {
  return PALETA[indice % PALETA.length];
}

/** Mesma cor pra todas as linhas de uma UF — primeira ocorrência na lista define a cor. */
function construirMapaCorPorEstado(estados: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const estado of estados) {
    if (!mapa.has(estado)) {
      mapa.set(estado, PALETA[mapa.size % PALETA.length]);
    }
  }
  return mapa;
}

function formatarDiaCurto(diaIso: string): string {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

const ESTILO_TOOLTIP = {
  contentStyle: {
    background: "#1a1a1a",
    border: `1px solid ${COR_BORDA}`,
    borderRadius: 4,
    fontFamily: "inherit",
    fontSize: 12,
  },
  labelStyle: { color: "#f5f5f5", fontWeight: 700 },
  itemStyle: { color: COR_VERDE },
};

function CartaoNumero({
  titulo,
  valor,
  sufixo,
  destaque,
}: {
  titulo: string;
  valor: string;
  sufixo?: string;
  destaque?: boolean;
}) {
  return (
    <div className="bia-cartao">
      <p className="bia-cartao-titulo">{titulo}</p>
      <p className={`bia-cartao-valor ${destaque ? "bia-cartao-valor-destaque" : ""}`}>
        {valor}
        {sufixo && <span className="bia-cartao-sufixo">{sufixo}</span>}
      </p>
    </div>
  );
}

function SecaoBia({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bia-secao">
      <h2 className="bia-secao-titulo">{titulo}</h2>
      {children}
    </section>
  );
}

function BarraRanking({
  rotulo,
  valorFormatado,
  percentual,
  cor,
  larga,
}: {
  rotulo: string;
  valorFormatado: string;
  percentual: number;
  cor: string;
  larga?: boolean;
}) {
  return (
    <div className={`bia-barra-linha ${larga ? "bia-barra-linha-larga" : ""}`}>
      <span className="bia-barra-rotulo" title={rotulo}>
        {rotulo}
      </span>
      <div className="bia-barra-trilho">
        <div className="bia-barra-fill" style={{ width: `${percentual}%`, background: cor }} />
      </div>
      <span className="bia-barra-valor">{valorFormatado}</span>
    </div>
  );
}

type AbaMercado = "marcas" | "estados" | "cidades";

export function PainelBia({
  resumo,
  descobertas7d,
  descobertas30d,
  valorPotencialHistorico,
  maisDisputados,
  marcasLuxo,
  estadosAtivos,
  cidadesAtivas,
}: {
  resumo: ResumoBia;
  descobertas7d: PontoSerie[];
  descobertas30d: PontoSerie[];
  valorPotencialHistorico: PontoValor[];
  maisDisputados: ItemDisputado[];
  marcasLuxo: ItemMarcaLuxo[];
  estadosAtivos: ItemEstadoAtivo[];
  cidadesAtivas: ItemCidadeAtiva[];
}) {
  const [janelaDescobertas, setJanelaDescobertas] = useState<7 | 30>(7);
  const [abaMercado, setAbaMercado] = useState<AbaMercado>("estados");
  const serieDescobertas = janelaDescobertas === 7 ? descobertas7d : descobertas30d;

  const marcasAgrupadas = new Map<string, ItemMarcaLuxo[]>();
  for (const item of marcasLuxo) {
    const lista = marcasAgrupadas.get(item.marca) ?? [];
    lista.push(item);
    marcasAgrupadas.set(item.marca, lista);
  }

  const maiorEstoqueEstado = Math.max(1, ...estadosAtivos.map((item) => item.quantidade));
  const maiorEstoqueCidade = Math.max(1, ...cidadesAtivas.map((item) => item.quantidade));
  const corPorEstado = construirMapaCorPorEstado(cidadesAtivas.map((item) => item.estado));

  return (
    <div className="bia-painel">
      <div className="bia-cartoes">
        <CartaoNumero titulo="Descobertas hoje" valor={String(resumo.descobertasHoje)} />
        <CartaoNumero titulo="Descobertas (7 dias)" valor={String(resumo.descobertas7d)} />
        <CartaoNumero titulo="Descobertas (30 dias)" valor={String(resumo.descobertas30d)} />
        <CartaoNumero titulo="Valor potencial em estoque" valor={formatarMoeda(resumo.valorPotencial)} destaque />
        <CartaoNumero titulo="Anúncios publicados" valor={String(resumo.anunciosPublicados)} />
        <CartaoNumero titulo="Desconto médio sobre a FIPE" valor={`${resumo.descontoMedio.toFixed(1)}%`} />
      </div>

      <SecaoBia titulo="Oportunidades descobertas por dia">
        <div className="bia-toggle-janela">
          <button
            type="button"
            className={`bia-toggle-opcao ${janelaDescobertas === 7 ? "bia-toggle-opcao-ativa" : ""}`}
            onClick={() => setJanelaDescobertas(7)}
          >
            7 dias
          </button>
          <button
            type="button"
            className={`bia-toggle-opcao ${janelaDescobertas === 30 ? "bia-toggle-opcao-ativa" : ""}`}
            onClick={() => setJanelaDescobertas(30)}
          >
            30 dias
          </button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={serieDescobertas}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COR_BORDA} />
            <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={11} stroke={COR_TEXTO_FRACO} />
            <YAxis fontSize={11} allowDecimals={false} stroke={COR_TEXTO_FRACO} />
            <Tooltip
              labelFormatter={(valor) => formatarDiaCurto(String(valor))}
              formatter={(valor) => [valor, "Descobertas"]}
              {...ESTILO_TOOLTIP}
            />
            <Bar dataKey="quantidade" fill={COR_VERDE} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoBia>

      {valorPotencialHistorico.length > 1 && (
        <SecaoBia titulo="Valor potencial em estoque — histórico">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={valorPotencialHistorico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COR_BORDA} />
              <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={11} stroke={COR_TEXTO_FRACO} />
              <YAxis fontSize={11} tickFormatter={(valor) => formatarMoeda(valor)} width={90} stroke={COR_TEXTO_FRACO} />
              <Tooltip
                labelFormatter={(valor) => formatarDiaCurto(String(valor))}
                formatter={(valor) => [formatarMoeda(Number(valor)), "Valor potencial"]}
                {...ESTILO_TOOLTIP}
              />
              <Line type="monotone" dataKey="valorPotencial" stroke={COR_VERDE} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SecaoBia>
      )}

      <SecaoBia titulo="Anúncios mais disputados (volume por modelo + estado)">
        <div className="bia-tabela-wrapper">
          <table className="bia-tabela">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Estado</th>
                <th>Qtd.</th>
                <th>Melhor margem</th>
                <th>KM mín.</th>
                <th>KM máx.</th>
              </tr>
            </thead>
            <tbody>
              {maisDisputados.map((item) => (
                <tr key={`${item.marca}-${item.modelo}-${item.estado}`}>
                  <td>{item.marca}</td>
                  <td>{item.modelo}</td>
                  <td>{item.estado}</td>
                  <td>{item.quantidade}</td>
                  <td>{item.melhorMargem !== null ? `${item.melhorMargem.toFixed(1)}%` : "—"}</td>
                  <td>{formatarKm(item.kmMin)}</td>
                  <td>{formatarKm(item.kmMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoBia>

      <SecaoBia titulo="Visão de mercado">
        <div className="bia-tabs">
          <button
            type="button"
            className={`bia-tab ${abaMercado === "marcas" ? "bia-tab-ativa" : ""}`}
            onClick={() => setAbaMercado("marcas")}
          >
            Marcas de luxo
          </button>
          <button
            type="button"
            className={`bia-tab ${abaMercado === "estados" ? "bia-tab-ativa" : ""}`}
            onClick={() => setAbaMercado("estados")}
          >
            Estados
          </button>
          <button
            type="button"
            className={`bia-tab ${abaMercado === "cidades" ? "bia-tab-ativa" : ""}`}
            onClick={() => setAbaMercado("cidades")}
          >
            Cidades
          </button>
        </div>

        {abaMercado === "marcas" && (
          <div className="bia-grade-marcas">
            {[...marcasAgrupadas.entries()].map(([marca, itens]) => {
              const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
              const liderEstado = itens[0];
              return (
                <div key={marca} className="bia-cartao-marca">
                  <p className="bia-cartao-marca-titulo">{marca}</p>
                  <p className="bia-cartao-marca-total">{total} no Brasil</p>
                  {liderEstado && (
                    <p className="bia-cartao-marca-lider">
                      {liderEstado.estado} lidera: {liderEstado.quantidade}
                    </p>
                  )}
                  <ul className="bia-cartao-marca-lista">
                    {itens.slice(0, 5).map((item) => (
                      <li key={item.estado}>
                        <span>{item.estado}</span>
                        <span>{item.quantidade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {abaMercado === "estados" && (
          <div className="bia-barras">
            {estadosAtivos.slice(0, 15).map((item, indice) => (
              <BarraRanking
                key={item.estado}
                rotulo={item.estado}
                valorFormatado={String(item.quantidade)}
                percentual={Math.max(4, (item.quantidade / maiorEstoqueEstado) * 100)}
                cor={corPorIndice(indice)}
              />
            ))}
          </div>
        )}

        {abaMercado === "cidades" && (
          <>
            <div className="bia-legenda">
              {[...corPorEstado.entries()].map(([estado, cor]) => (
                <span key={estado} className="bia-legenda-item">
                  <span className="bia-legenda-ponto" style={{ background: cor }} />
                  {estado}
                </span>
              ))}
            </div>
            <div className="bia-barras">
              {cidadesAtivas.map((item) => (
                <BarraRanking
                  key={`${item.cidade}-${item.estado}`}
                  rotulo={item.cidade}
                  valorFormatado={String(item.quantidade)}
                  percentual={Math.max(4, (item.quantidade / maiorEstoqueCidade) * 100)}
                  cor={corPorEstado.get(item.estado) ?? COR_VERDE}
                  larga
                />
              ))}
            </div>
          </>
        )}
      </SecaoBia>
    </div>
  );
}
