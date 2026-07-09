"use client";

import { useMemo, useState } from "react";
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
import brasilMapa from "@svg-maps/brazil";
import { formatarMoeda } from "@/lib/formatadores";
import {
  corDaMarca,
  corMapa,
  formatarInteiro,
  formatarMoedaArredondada,
  formatarPercentual1,
  hueMarcaLuxo,
  normalizar,
} from "@/lib/biaCores";
import type {
  ItemCidadeAtiva,
  ItemDisputado,
  ItemEstadoAtivo,
  ItemMarcaLuxo,
  ItemTendenciaDestaque,
  PontoSerie,
  PontoValor,
  ResumoBia,
} from "@/lib/biaDashboard";
import { gerarInsightTendencia } from "@/lib/insightTendencia";

const HUE_ESTOQUE = 150; // verde da marca (era 230/azul) — mapa e barras de estoque
const HUE_PRECO = 155; // verde levemente distinto pro "por quanto"
const COR_VERDE_GRAFICO = "oklch(0.7 0.15 150)";
const COR_BORDA_GRAFICO = "#222838";
const COR_TEXTO_FRACO_GRAFICO = "#7b8395";

function formatarDiaCurto(diaIso: string): string {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

const ESTILO_TOOLTIP = {
  contentStyle: {
    background: "#161a23",
    border: `1px solid ${COR_BORDA_GRAFICO}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 12,
  },
  labelStyle: { color: "#eef1f6", fontWeight: 700 },
  itemStyle: { color: COR_VERDE_GRAFICO },
};

function Eyebrow({ numero, texto }: { numero: string; texto: string }) {
  return <div className="bia-eyebrow-secao">{`${numero} — ${texto}`}</div>;
}

function Toggle<T extends string>({
  opcoes,
  ativo,
  onSelecionar,
}: {
  opcoes: { valor: T; rotulo: string }[];
  ativo: T;
  onSelecionar: (valor: T) => void;
}) {
  return (
    <div className="bia2-toggle">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className={`bia2-toggle-opcao ${ativo === opcao.valor ? "bia2-toggle-opcao-ativa" : ""}`}
          onClick={() => onSelecionar(opcao.valor)}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function BarraSimples({ percentual, cor, alturaPx = 10 }: { percentual: number; cor: string; alturaPx?: number }) {
  return (
    <div className="bia2-trilho" style={{ height: alturaPx }}>
      <div className="bia2-trilho-fundo" />
      <div className="bia2-trilho-fill" style={{ width: `${percentual}%`, background: cor }} />
    </div>
  );
}

/** Choropleth real do Brasil (SVG inline). Cada UF pintada pela cor da métrica
 *  ativa; hover destaca o contorno e alimenta o painel lateral. UF sem amostra
 *  cai em cinza neutro. */
function MapaBrasil({
  cores,
  hoverUf,
  onHover,
  onSair,
}: {
  cores: Map<string, string>;
  hoverUf: string | null;
  onHover: (uf: string) => void;
  onSair: () => void;
}) {
  return (
    <svg
      viewBox={brasilMapa.viewBox}
      className="bia2-mapa-svg"
      role="img"
      aria-label="Mapa do Brasil por estado"
      onMouseLeave={onSair}
    >
      {brasilMapa.locations.map((loc) => {
        const uf = loc.id.toUpperCase();
        const ativo = hoverUf === uf;
        return (
          <path
            key={uf}
            d={loc.path}
            fill={cores.get(uf) ?? COR_TILE_SEM_AMOSTRA}
            stroke={ativo ? "#111" : "#fff"}
            strokeWidth={ativo ? 1.8 : 0.8}
            style={{ cursor: "default" }}
            onMouseEnter={() => onHover(uf)}
          >
            <title>{loc.name}</title>
          </path>
        );
      })}
    </svg>
  );
}

type MetricaEstado = "estoque" | "preco" | "margem";

// Config por métrica: rótulo do toggle/ranking, matiz do mapa e rótulos dos
// extremos da legenda. Margem é a métrica-herói (valor > volume bruto).
const META_METRICA: Record<MetricaEstado, { rotulo: string; hue: number; extremoBaixo: string; extremoAlto: string }> = {
  margem: { rotulo: "Margem média", hue: HUE_ESTOQUE, extremoBaixo: "Menor", extremoAlto: "Maior" },
  preco: { rotulo: "Preço médio", hue: HUE_PRECO, extremoBaixo: "Acessível", extremoAlto: "Caro" },
  estoque: { rotulo: "Estoque", hue: HUE_ESTOQUE, extremoBaixo: "Menos", extremoAlto: "Mais" },
};

const OPCOES_METRICA = [
  { valor: "margem" as const, rotulo: "Margem" },
  { valor: "preco" as const, rotulo: "Preço médio" },
  { valor: "estoque" as const, rotulo: "Estoque" },
];

// Piso de amostra pra métrica de margem: um estado/cidade com 1-2 anúncios de
// margem alta é ruído e detonaria a escala do mapa. Abaixo do piso, a margem
// não é confiável → tile neutro / fora do ranking.
const MIN_AMOSTRA_MARGEM_UF = 5;
const MIN_AMOSTRA_MARGEM_CIDADE = 3;
const COR_TILE_SEM_AMOSTRA = "#e9ecf0";

function SecaoEstados({ estados }: { estados: ItemEstadoAtivo[] }) {
  const [metrica, setMetrica] = useState<MetricaEstado>("margem");
  const [hoverUf, setHoverUf] = useState<string | null>(null);
  const meta = META_METRICA[metrica];
  const hue = meta.hue;

  const valorDe = (e: ItemEstadoAtivo) =>
    metrica === "estoque" ? e.quantidade : metrica === "preco" ? e.precoMedio : e.margemMedia ?? 0;
  const rotuloValor = (v: number) =>
    metrica === "estoque"
      ? formatarInteiro(v)
      : metrica === "preco"
        ? formatarMoedaArredondada(v)
        : formatarPercentual1(v);

  // Amostra confiável: só filtra na métrica de margem (estoque/preço valem sempre).
  const amostraOk = (e: ItemEstadoAtivo) => metrica !== "margem" || e.quantidade >= MIN_AMOSTRA_MARGEM_UF;

  const valores = estados.filter(amostraOk).map(valorDe);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const norm = (v: number) => normalizar(v, min, max);

  // Cor de cada UF pro choropleth (sem amostra → cinza neutro).
  const coresMapa = new Map<string, string>();
  for (const e of estados) {
    coresMapa.set(e.estado, amostraOk(e) ? corMapa(norm(valorDe(e)), hue).bg : COR_TILE_SEM_AMOSTRA);
  }

  const legendaStops = [0.08, 0.3, 0.52, 0.74, 0.96].map((t) => corMapa(t, hue).bg);

  const ranking = [...estados]
    .filter(amostraOk)
    .sort((a, b) => valorDe(b) - valorDe(a))
    .slice(0, 12)
    .map((e) => {
      const valor = valorDe(e);
      return {
        uf: e.estado,
        percentual: norm(valor) * 100,
        cor: corMapa(0.45 + 0.45 * norm(valor), hue).bg,
        valLabel: rotuloValor(valor),
      };
    });

  // Card de extremos acompanha a métrica quando é preço ou margem; pra estoque cai em preço.
  const metricaExtremos: "preco" | "margem" = metrica === "margem" ? "margem" : "preco";
  const valorExtremo = (e: ItemEstadoAtivo) => (metricaExtremos === "preco" ? e.precoMedio : e.margemMedia ?? 0);
  const ordenadoExtremos = [...estados]
    .filter((e) => metricaExtremos !== "margem" || e.quantidade >= MIN_AMOSTRA_MARGEM_UF)
    .sort((a, b) => valorExtremo(b) - valorExtremo(a));
  const topoExtremos = ordenadoExtremos.slice(0, 4);
  const baseExtremos = ordenadoExtremos.slice(-4).reverse();
  const fmtExtremo = (e: ItemEstadoAtivo) =>
    metricaExtremos === "preco" ? formatarMoedaArredondada(e.precoMedio) : formatarPercentual1(e.margemMedia ?? 0);

  const estadoHover = hoverUf ? estados.find((e) => e.estado === hoverUf) : null;
  let linha1 = "";
  let linha2 = "";
  if (estadoHover) {
    const margemTxt =
      estadoHover.margemMedia != null ? ` · margem ${formatarPercentual1(estadoHover.margemMedia)}` : "";
    linha1 = `${formatarInteiro(estadoHover.quantidade)} anúncios · ${formatarMoedaArredondada(estadoHover.precoMedio)} médio${margemTxt}`;
    const rkEstoque = [...estados].sort((a, b) => b.quantidade - a.quantidade).findIndex((e) => e.estado === hoverUf) + 1;
    const rkPreco = [...estados].sort((a, b) => b.precoMedio - a.precoMedio).findIndex((e) => e.estado === hoverUf) + 1;
    const rkMargem =
      [...estados].sort((a, b) => (b.margemMedia ?? 0) - (a.margemMedia ?? 0)).findIndex((e) => e.estado === hoverUf) + 1;
    linha2 = `Estoque #${rkEstoque}  ·  Preço #${rkPreco}  ·  Margem #${rkMargem}`;
  }

  return (
    <section className="bia2-secao">
      <div className="bia2-secao-cabecalho">
        <div>
          <Eyebrow numero="01" texto="Geografia do estoque" />
          <h2 className="bia2-titulo-secao">Estados mais ativos</h2>
        </div>
        <Toggle opcoes={OPCOES_METRICA} ativo={metrica} onSelecionar={setMetrica} />
      </div>

      <div className="bia2-grid-2col">
        <div className="bia2-card">
          <MapaBrasil
            cores={coresMapa}
            hoverUf={hoverUf}
            onHover={setHoverUf}
            onSair={() => setHoverUf(null)}
          />

          <div className="bia2-legenda-mapa">
            <span className="bia2-legenda-extremo">{meta.extremoBaixo}</span>
            <div className="bia2-legenda-faixa">
              {legendaStops.map((cor, i) => (
                <div key={i} className="bia2-legenda-stop" style={{ background: cor }} />
              ))}
            </div>
            <span className="bia2-legenda-extremo">{meta.extremoAlto}</span>
          </div>

          <div className="bia2-painel-hover">
            {estadoHover ? (
              <div className="bia2-painel-hover-conteudo">
                <div className="bia2-painel-hover-uf">{hoverUf}</div>
                <div>
                  <div className="bia2-painel-hover-linha1">{linha1}</div>
                  <div className="bia2-painel-hover-linha2">{linha2}</div>
                </div>
              </div>
            ) : (
              <div className="bia2-painel-hover-vazio">Passe o cursor sobre um estado para ver margem, preço e estoque.</div>
            )}
          </div>
        </div>

        <div className="bia2-coluna-flex">
          <div className="bia2-card bia2-card-flex">
            <div className="bia2-rotulo-mono">Top 12 · {meta.rotulo}</div>
            <div className="bia2-ranking-lista">
              {ranking.map((item) => (
                <div key={item.uf} className="bia2-ranking-linha">
                  <span className="bia2-ranking-uf">{item.uf}</span>
                  <BarraSimples percentual={item.percentual} cor={item.cor} alturaPx={18} />
                  <span className="bia2-ranking-valor">{item.valLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bia2-card">
            <div className="bia2-rotulo-mono">
              {metricaExtremos === "margem" ? "Margem média" : "Preço médio"} · extremos do país
            </div>
            <div className="bia2-extremos-grid">
              <div>
                <div className="bia2-extremos-titulo bia2-extremos-caro">
                  {metricaExtremos === "margem" ? "MAIOR MARGEM" : "MAIS CAROS"}
                </div>
                {topoExtremos.map((e) => (
                  <div key={e.estado} className="bia2-extremos-linha">
                    <span className="bia2-extremos-uf">{e.estado}</span>
                    <span className="bia2-extremos-valor">{fmtExtremo(e)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="bia2-extremos-titulo bia2-extremos-acessivel">
                  {metricaExtremos === "margem" ? "MENOR MARGEM" : "MAIS ACESSÍVEIS"}
                </div>
                {baseExtremos.map((e) => (
                  <div key={e.estado} className="bia2-extremos-linha">
                    <span className="bia2-extremos-uf">{e.estado}</span>
                    <span className="bia2-extremos-valor">{fmtExtremo(e)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecaoCidades({ cidades }: { cidades: ItemCidadeAtiva[] }) {
  const [metrica, setMetrica] = useState<MetricaEstado>("margem");
  const meta = META_METRICA[metrica];
  const hue = meta.hue;

  const valorDe = (c: ItemCidadeAtiva) =>
    metrica === "estoque" ? c.quantidade : metrica === "preco" ? c.precoMedio : c.margemMedia ?? 0;
  const rotuloValor = (v: number) =>
    metrica === "estoque"
      ? `${formatarInteiro(v)} un.`
      : metrica === "preco"
        ? formatarMoedaArredondada(v)
        : formatarPercentual1(v);

  // Na métrica de margem, tira cidades de amostra minúscula (ruído).
  const base =
    metrica === "margem" ? cidades.filter((c) => c.quantidade >= MIN_AMOSTRA_MARGEM_CIDADE) : cidades;
  const ordenadas = [...base].sort((a, b) => valorDe(b) - valorDe(a));
  const max = Math.max(...ordenadas.map(valorDe), 1);

  return (
    <section className="bia2-secao">
      <div className="bia2-secao-cabecalho">
        <div>
          <Eyebrow numero="02" texto="Praças" />
          <h2 className="bia2-titulo-secao">Cidades mais ativas</h2>
        </div>
        <Toggle opcoes={OPCOES_METRICA} ativo={metrica} onSelecionar={setMetrica} />
      </div>

      <div className="bia2-card bia2-cidades-lista">
        {ordenadas.map((cidade) => {
          const valor = valorDe(cidade);
          const t = valor / max;
          return (
            <div key={`${cidade.cidade}-${cidade.estado}`} className="bia2-cidade-linha">
              <div className="bia2-cidade-nome-grupo">
                <span className="bia2-cidade-nome" title={cidade.cidade}>
                  {cidade.cidade}
                </span>
                <span className="bia2-cidade-uf">{cidade.estado}</span>
              </div>
              <div className="bia2-cidade-barra-grupo">
                <BarraSimples percentual={t * 100} cor={corMapa(0.5 + 0.4 * t, hue).bg} alturaPx={18} />
                <span className="bia2-cidade-valor">{rotuloValor(valor)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type OrdemDisputado = "qtd" | "margem";

function SecaoDisputados({ disputados }: { disputados: ItemDisputado[] }) {
  const [marcaAtiva, setMarcaAtiva] = useState("Todas");
  const [ordem, setOrdem] = useState<OrdemDisputado>("qtd");
  const isVolume = ordem === "qtd";

  const marcas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const item of disputados) {
      contagem.set(item.marca, (contagem.get(item.marca) ?? 0) + item.quantidade);
    }
    return ["Todas", ...[...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([marca]) => marca)];
  }, [disputados]);

  const kmGlobal = Math.max(...disputados.map((item) => item.kmMax ?? 0), 1);

  const filtrados = disputados.filter((item) => marcaAtiva === "Todas" || item.marca === marcaAtiva);
  const ordenados = [...filtrados].sort((a, b) =>
    isVolume ? b.quantidade - a.quantidade : (b.melhorMargem ?? 0) - (a.melhorMargem ?? 0)
  );
  const maiorValor = Math.max(...ordenados.map((item) => (isVolume ? item.quantidade : item.melhorMargem ?? 0)), 1);

  return (
    <section className="bia2-secao">
      <div className="bia2-secao-cabecalho">
        <div>
          <Eyebrow numero="03" texto="Concorrência" />
          <h2 className="bia2-titulo-secao">Anúncios mais disputados</h2>
        </div>
        <Toggle
          opcoes={[
            { valor: "qtd", rotulo: "Volume" },
            { valor: "margem", rotulo: "Margem" },
          ]}
          ativo={ordem}
          onSelecionar={setOrdem}
        />
      </div>

      <div className="bia2-chips">
        {marcas.map((marca) => (
          <button
            key={marca}
            type="button"
            className={`bia2-chip ${marcaAtiva === marca ? "bia2-chip-ativo" : ""}`}
            onClick={() => setMarcaAtiva(marca)}
          >
            {(() => {
              const corPonto = marca === "Todas" ? "#8b93a3" : corDaMarca(marca);
              return (
                <span
                  className="bia2-chip-ponto"
                  style={{ background: corPonto, boxShadow: `0 0 8px ${corPonto}` }}
                />
              );
            })()}
            {marca}
          </button>
        ))}
      </div>

      <div className="bia2-card bia2-disputados-card">
        <div className="bia2-disputados-cabecalho">
          <span>Modelo</span>
          <span>{isVolume ? "Volume de anúncios · margem" : "Melhor margem · volume"}</span>
          <span className="bia2-alinhar-direita">Faixa de KM</span>
        </div>
        {ordenados.map((item) => {
          const valor = isVolume ? item.quantidade : item.melhorMargem ?? 0;
          const percentual = (valor / maiorValor) * 100;
          const margemAlta = (item.melhorMargem ?? 0) >= 25;
          const temKm = item.kmMin !== null && item.kmMax !== null;
          const kmLeft = temKm ? ((item.kmMin as number) / kmGlobal) * 100 : 0;
          const kmW = temKm ? Math.max(((item.kmMax as number) - (item.kmMin as number)) / kmGlobal * 100, 1.5) : 0;
          return (
            <div key={`${item.marca}-${item.modelo}`} className="bia2-disputado-linha">
              <div className="bia2-disputado-modelo-grupo">
                <span
                  className="bia2-disputado-ponto"
                  style={{ background: corDaMarca(item.marca), boxShadow: `0 0 8px ${corDaMarca(item.marca)}` }}
                />
                <div>
                  <div className="bia2-disputado-modelo">{item.modelo}</div>
                  <div className="bia2-disputado-marca">
                    {item.marca} · líder <span className="bia2-disputado-uf">{item.ufLider}</span> ·{" "}
                    {item.qtdEstados} {item.qtdEstados === 1 ? "UF" : "UFs"}
                  </div>
                </div>
              </div>
              <div className="bia2-disputado-barra-grupo">
                <BarraSimples percentual={percentual} cor={corDaMarca(item.marca)} alturaPx={18} />
                <span className="bia2-disputado-valores">
                  <span className="bia2-disputado-qtd">{item.quantidade} un.</span>
                  <span className={margemAlta ? "bia2-badge-margem" : "bia2-margem-normal"}>
                    {item.melhorMargem !== null ? formatarPercentual1(item.melhorMargem) : "—"}
                  </span>
                </span>
              </div>
              <div>
                {temKm ? (
                  <>
                    <div className="bia2-km-trilho">
                      <div className="bia2-km-fill" style={{ left: `${kmLeft}%`, width: `${kmW}%` }} />
                    </div>
                    <div className="bia2-km-label">
                      {formatarInteiro(item.kmMin as number)}–{formatarInteiro(item.kmMax as number)}
                    </div>
                  </>
                ) : (
                  <div className="bia2-km-label">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SecaoLuxo({ marcasLuxo }: { marcasLuxo: ItemMarcaLuxo[] }) {
  const marcasAgrupadas = useMemo(() => {
    const mapa = new Map<string, ItemMarcaLuxo[]>();
    for (const item of marcasLuxo) {
      const lista = mapa.get(item.marca) ?? [];
      lista.push(item);
      mapa.set(item.marca, lista);
    }
    return [...mapa.entries()];
  }, [marcasLuxo]);

  return (
    <section className="bia2-secao">
      <Eyebrow numero="04" texto="Alto padrão" />
      <h2 className="bia2-titulo-secao">Marcas de luxo por estado</h2>
      <p className="bia2-paragrafo-apoio">
        Distribuição das marcas premium capturadas pelo motor de descoberta, por unidade federativa.
      </p>

      <div className="bia2-grid-marcas">
        {marcasAgrupadas.map(([marca, itens]) => {
          const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
          const lider = itens[0];
          const hue = hueMarcaLuxo(marca);
          const cor = `oklch(0.7 0.14 ${hue})`;
          // Mercedes-Benz quebra o layout do card (2 linhas); "Mercedes" basta.
          const nomeExibido = /^mercedes/i.test(marca) ? "Mercedes" : marca;
          return (
            <div key={marca} className="bia2-card bia2-card-marca">
              <div className="bia2-card-marca-topo">
                <div className="bia2-card-marca-nome-grupo">
                  <span className="bia2-card-marca-quadrado" style={{ background: cor, boxShadow: `0 0 10px ${cor}` }} />
                  <span className="bia2-card-marca-nome">{nomeExibido}</span>
                </div>
                <span className="bia2-card-marca-total">{total} no Brasil</span>
              </div>
              {lider && <div className="bia2-card-marca-lidera">Lidera: {lider.estado}</div>}
              <div className="bia2-card-marca-lista">
                {itens.slice(0, 5).map((item, indice) => (
                  <div key={item.estado} className="bia2-card-marca-linha">
                    <span
                      className="bia2-card-marca-uf"
                      style={{ fontWeight: indice === 0 ? 800 : 500, color: indice === 0 ? "#111" : "#8696a0" }}
                    >
                      {item.estado}
                    </span>
                    <BarraSimples
                      percentual={lider ? (item.quantidade / lider.quantidade) * 100 : 0}
                      cor={indice === 0 ? cor : `oklch(0.5 0.07 ${hue})`}
                      alturaPx={14}
                    />
                    <span className="bia2-card-marca-qtd">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SecaoTendenciaMensal({ destaques }: { destaques: ItemTendenciaDestaque[] }) {
  return (
    <section className="bia2-secao">
      <Eyebrow numero="05" texto="Fase 4 · Tendência mensal" />
      <h2 className="bia2-titulo-secao">Tendências do mês</h2>
      <p className="bia2-paragrafo-apoio">
        Comparação de margem média e volume de oferta mês a mês, por modelo. A série histórica começou
        em 27/06/2026 — comparações ficam mais completas conforme a base acumula mais meses.
      </p>

      {destaques.length === 0 ? (
        <div className="bia2-card">
          <div className="bia2-painel-hover-vazio">
            Ainda não há dois meses completos de histórico pra comparar — volte aqui no próximo mês.
          </div>
        </div>
      ) : (
        <div className="bia2-card bia2-cidades-lista">
          {destaques.map((item) => (
            <div key={`${item.marca}-${item.modelo}`} className="bia2-cidade-linha">
              <div className="bia2-cidade-nome-grupo">
                <span className="bia2-cidade-nome">{gerarInsightTendencia(item)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
  tendenciaDestaques,
}: {
  resumo: ResumoBia;
  descobertas7d: PontoSerie[];
  descobertas30d: PontoSerie[];
  valorPotencialHistorico: PontoValor[];
  maisDisputados: ItemDisputado[];
  marcasLuxo: ItemMarcaLuxo[];
  estadosAtivos: ItemEstadoAtivo[];
  cidadesAtivas: ItemCidadeAtiva[];
  tendenciaDestaques: ItemTendenciaDestaque[];
}) {
  const [janelaDescobertas, setJanelaDescobertas] = useState<"7" | "30">("7");
  const serieDescobertas = janelaDescobertas === "7" ? descobertas7d : descobertas30d;

  const totalEstoque = estadosAtivos.reduce((soma, e) => soma + e.quantidade, 0);
  const ticketMedio =
    totalEstoque > 0
      ? estadosAtivos.reduce((soma, e) => soma + e.quantidade * e.precoMedio, 0) / totalEstoque
      : 0;

  return (
    <div className="bia-painel">
      <div className="bia2-kpis">
        <div className="bia2-kpi">
          <div className="bia2-kpi-rotulo">Estoque nac.</div>
          <div className="bia2-kpi-valor">{formatarInteiro(totalEstoque)}</div>
        </div>
        <div className="bia2-kpi">
          <div className="bia2-kpi-rotulo">Ticket médio</div>
          <div className="bia2-kpi-valor bia2-kpi-valor-destaque">{formatarMoedaArredondada(ticketMedio)}</div>
        </div>
        <div className="bia2-kpi">
          <div className="bia2-kpi-rotulo">UFs cobertas</div>
          <div className="bia2-kpi-valor">{estadosAtivos.length}</div>
        </div>
        <div className="bia2-kpi">
          <div className="bia2-kpi-rotulo">Cidades no ranking</div>
          <div className="bia2-kpi-valor">{cidadesAtivas.length}</div>
        </div>
      </div>

      <SecaoEstados estados={estadosAtivos} />
      <SecaoCidades cidades={cidadesAtivas} />
      <SecaoDisputados disputados={maisDisputados} />
      <SecaoLuxo marcasLuxo={marcasLuxo} />
      <SecaoTendenciaMensal destaques={tendenciaDestaques} />

      <section className="bia2-secao">
        <Eyebrow numero="06" texto="Tendência diária" />
        <h2 className="bia2-titulo-secao">Oportunidades descobertas por dia</h2>
        <div className="bia2-card" style={{ marginTop: 18 }}>
          <Toggle
            opcoes={[
              { valor: "7", rotulo: "7 dias" },
              { valor: "30", rotulo: "30 dias" },
            ]}
            ativo={janelaDescobertas}
            onSelecionar={setJanelaDescobertas}
          />
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serieDescobertas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COR_BORDA_GRAFICO} />
                <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={11} stroke={COR_TEXTO_FRACO_GRAFICO} />
                <YAxis fontSize={11} allowDecimals={false} stroke={COR_TEXTO_FRACO_GRAFICO} />
                <Tooltip
                  labelFormatter={(valor) => formatarDiaCurto(String(valor))}
                  formatter={(valor) => [valor, "Descobertas"]}
                  {...ESTILO_TOOLTIP}
                />
                <Bar dataKey="quantidade" fill={COR_VERDE_GRAFICO} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {valorPotencialHistorico.length > 1 && (
        <section className="bia2-secao">
          <h2 className="bia2-titulo-secao">Valor potencial em estoque — histórico</h2>
          <div className="bia2-card" style={{ marginTop: 18 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={valorPotencialHistorico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COR_BORDA_GRAFICO} />
                <XAxis dataKey="dia" tickFormatter={formatarDiaCurto} fontSize={11} stroke={COR_TEXTO_FRACO_GRAFICO} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(valor) => formatarMoeda(valor)}
                  width={90}
                  stroke={COR_TEXTO_FRACO_GRAFICO}
                />
                <Tooltip
                  labelFormatter={(valor) => formatarDiaCurto(String(valor))}
                  formatter={(valor) => [formatarMoeda(Number(valor)), "Valor potencial"]}
                  {...ESTILO_TOOLTIP}
                />
                <Line type="monotone" dataKey="valorPotencial" stroke={COR_VERDE_GRAFICO} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <footer className="bia2-rodape">
        <span>Painel de inteligência de estoque · {formatarInteiro(resumo.descobertasHoje)} descobertas hoje</span>
        <span>Valores em R$ · preços médios por anúncio ativo</span>
      </footer>
    </div>
  );
}
