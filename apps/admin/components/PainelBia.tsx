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

const COR_PRIMARIA = "#16a34a";

function formatarDiaCurto(diaIso: string): string {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

function CartaoNumero({ titulo, valor, sufixo }: { titulo: string; valor: string; sufixo?: string }) {
  return (
    <div className="bia-cartao">
      <p className="bia-cartao-titulo">{titulo}</p>
      <p className="bia-cartao-valor">
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
  const serieDescobertas = janelaDescobertas === 7 ? descobertas7d : descobertas30d;

  const marcasAgrupadas = new Map<string, ItemMarcaLuxo[]>();
  for (const item of marcasLuxo) {
    const lista = marcasAgrupadas.get(item.marca) ?? [];
    lista.push(item);
    marcasAgrupadas.set(item.marca, lista);
  }

  return (
    <div className="bia-painel">
      <div className="bia-cartoes">
        <CartaoNumero titulo="Descobertas hoje" valor={String(resumo.descobertasHoje)} />
        <CartaoNumero titulo="Descobertas (7 dias)" valor={String(resumo.descobertas7d)} />
        <CartaoNumero titulo="Descobertas (30 dias)" valor={String(resumo.descobertas30d)} />
        <CartaoNumero titulo="Valor potencial em estoque" valor={formatarMoeda(resumo.valorPotencial)} />
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip labelFormatter={(valor) => formatarDiaCurto(String(valor))} formatter={(valor) => [valor, "Descobertas"]} />
            <Bar dataKey="quantidade" fill={COR_PRIMARIA} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoBia>

      {valorPotencialHistorico.length > 1 && (
        <SecaoBia titulo="Valor potencial em estoque — histórico">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={valorPotencialHistorico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(valor) => formatarMoeda(valor)} width={90} />
              <Tooltip
                labelFormatter={(valor) => formatarDiaCurto(String(valor))}
                formatter={(valor) => [formatarMoeda(Number(valor)), "Valor potencial"]}
              />
              <Line type="monotone" dataKey="valorPotencial" stroke={COR_PRIMARIA} strokeWidth={2} dot={false} />
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

      <SecaoBia titulo="Marcas de luxo por estado">
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
      </SecaoBia>

      <SecaoBia titulo="Estados mais ativos">
        <div className="bia-tabela-wrapper">
          <table className="bia-tabela">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Estoque</th>
                <th>Preço médio</th>
              </tr>
            </thead>
            <tbody>
              {estadosAtivos.map((item) => (
                <tr key={item.estado}>
                  <td>{item.estado}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatarMoeda(item.precoMedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoBia>

      <SecaoBia titulo="Cidades mais ativas">
        <div className="bia-tabela-wrapper">
          <table className="bia-tabela">
            <thead>
              <tr>
                <th>Cidade</th>
                <th>Estado</th>
                <th>Estoque</th>
                <th>Preço médio</th>
              </tr>
            </thead>
            <tbody>
              {cidadesAtivas.map((item) => (
                <tr key={`${item.cidade}-${item.estado}`}>
                  <td>{item.cidade}</td>
                  <td>{item.estado}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatarMoeda(item.precoMedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoBia>
    </div>
  );
}
