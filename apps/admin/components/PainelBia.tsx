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
import { formatarMoeda } from "@/lib/formatadores";
import {
  corDaMarca,
  corMapa,
  formatarInteiro,
  formatarMoedaArredondada,
  formatarPercentual1,
  hueMarcaLuxo,
  normalizar,
  posicaoGridUf,
} from "@/lib/biaCores";
import type {
  ItemCidadeAtiva,
  ItemDisputado,
  ItemEstadoAtivo,
  ItemMarcaLuxo,
  ItemTendenciaPrincipal,
  PontoSerie,
  PontoValor,
  ResumoBia,
} from "@/lib/biaDashboard";
import { analisarTendencia, type TomTendencia } from "@/lib/insightTendencia";

const HUE_ESTOQUE = 150; // verde da marca (era 230/azul) — mapa e barras de estoque
const HUE_PRECO = 155; // verde levemente distinto pro "por quanto"
const COR_VERDE_GRAFICO = "oklch(0.7 0.15 150)";
const COR_BORDA_GRAFICO = "#222838";
const COR_TEXTO_FRACO_GRAFICO = "#7b8395";

function formatarDiaCurto(diaIso: string): string {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

// KM arredondado pra milhares numa leitura rápida: 20.025 → "20mil", 0 → "0".
function kmMil(v: number): string {
  const mil = Math.floor(v / 1000);
  return mil === 0 ? "0" : `${mil}mil`;
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

type MetricaEstado = "estoque" | "preco" | "margem";

// Config por métrica: rótulo do toggle/ranking, matiz do mapa e rótulos dos
// extremos da legenda. Margem é a métrica-herói (valor > volume bruto).
const META_METRICA: Record<MetricaEstado, { rotulo: string; hue: number; extremoBaixo: string; extremoAlto: string }> = {
  margem: { rotulo: "Margem média", hue: HUE_ESTOQUE, extremoBaixo: "Menor", extremoAlto: "Maior" },
  preco: { rotulo: "Preço médio", hue: HUE_PRECO, extremoBaixo: "Acessível", extremoAlto: "Caro" },
  estoque: { rotulo: "Estoque", hue: HUE_ESTOQUE, extremoBaixo: "Menos", extremoAlto: "Mais" },
};

const OPCOES_METRICA = [
  { valor: "preco" as const, rotulo: "Preço médio" },
  { valor: "margem" as const, rotulo: "Margem" },
  { valor: "estoque" as const, rotulo: "Estoque" },
];

// Piso de amostra pra métrica de margem: um estado/cidade com 1-2 anúncios de
// margem alta é ruído e detonaria a escala do mapa. Abaixo do piso, a margem
// não é confiável → tile neutro / fora do ranking.
const MIN_AMOSTRA_MARGEM_UF = 5;
const MIN_AMOSTRA_MARGEM_CIDADE = 3;
const COR_TILE_SEM_AMOSTRA = "#e9ecf0";
const COR_TILE_SEM_AMOSTRA_FG = "#9aa2ad";

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
  const rotuloTile = (v: number) =>
    metrica === "estoque"
      ? formatarInteiro(v)
      : metrica === "preco"
        ? `${Math.round(v / 1000)}k`
        : formatarPercentual1(v);

  // Amostra confiável: só filtra na métrica de margem (estoque/preço valem sempre).
  const amostraOk = (e: ItemEstadoAtivo) => metrica !== "margem" || e.quantidade >= MIN_AMOSTRA_MARGEM_UF;

  const valores = estados.filter(amostraOk).map(valorDe);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const norm = (v: number) => normalizar(v, min, max);

  const tiles = estados
    .map((e) => {
      const posicao = posicaoGridUf(e.estado);
      if (!posicao) return null;
      if (!amostraOk(e)) {
        return {
          uf: e.estado,
          row: posicao[0],
          col: posicao[1],
          bg: COR_TILE_SEM_AMOSTRA,
          fg: COR_TILE_SEM_AMOSTRA_FG,
          valLabel: "—",
          emHover: hoverUf === e.estado,
        };
      }
      const valor = valorDe(e);
      const { bg, fg } = corMapa(norm(valor), hue);
      return {
        uf: e.estado,
        row: posicao[0],
        col: posicao[1],
        bg,
        fg,
        valLabel: rotuloTile(valor),
        emHover: hoverUf === e.estado,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const legendaStops = [0.08, 0.3, 0.52, 0.74, 0.96].map((t) => corMapa(t, hue).bg);

  const rankingBase = [...estados]
    .filter(amostraOk)
    .sort((a, b) => valorDe(b) - valorDe(a))
    .slice(0, 12);
  // Cor espalhada no range REAL do top 12 (não na escala global): os 12 do topo
  // ficam numa faixa estreita, então norm global deixava a cor quase igual.
  const minTop = Math.min(...rankingBase.map(valorDe));
  const maxTop = Math.max(...rankingBase.map(valorDe));
  const intensidadeTop = (v: number) => (maxTop > minTop ? (v - minTop) / (maxTop - minTop) : 0.7);
  const ranking = rankingBase.map((e) => {
    const valor = valorDe(e);
    return {
      uf: e.estado,
      percentual: norm(valor) * 100,
      cor: corMapa(0.14 + 0.82 * intensidadeTop(valor), hue).bg,
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
          <div className="bia2-mapa" onMouseLeave={() => setHoverUf(null)}>
            {tiles.map((tile) => (
              <div
                key={tile.uf}
                onMouseEnter={() => setHoverUf(tile.uf)}
                className="bia2-mapa-tile"
                style={{
                  gridRow: tile.row,
                  gridColumn: tile.col,
                  background: tile.bg,
                  color: tile.fg,
                  boxShadow: tile.emHover ? "0 0 0 2px #eef1f6" : "none",
                }}
              >
                <div className="bia2-mapa-tile-uf">{tile.uf}</div>
                <div className="bia2-mapa-tile-valor">{tile.valLabel}</div>
              </div>
            ))}
          </div>

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
                <div
                  className={`bia2-extremos-titulo ${
                    metricaExtremos === "margem" ? "bia2-extremos-verde" : "bia2-extremos-vermelho"
                  }`}
                >
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
                <div
                  className={`bia2-extremos-titulo ${
                    metricaExtremos === "margem" ? "bia2-extremos-vermelho" : "bia2-extremos-verde"
                  }`}
                >
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
  const min = Math.min(...ordenadas.map(valorDe));
  // Intensidade da cor espalhada no range REAL (min–max) — os valores são
  // próximos (ex.: margem 8–12%), então valor/max deixaria tudo homogêneo.
  const intensidade = (v: number) => (max > min ? (v - min) / (max - min) : 0.7);

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
                <BarraSimples
                  percentual={t * 100}
                  cor={corMapa(0.14 + 0.82 * intensidade(valor), hue).bg}
                  alturaPx={18}
                />
                <span className="bia2-cidade-valor">{rotuloValor(valor)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type OrdemDisputado = "margem" | "km" | "qtd";

// Quantos modelos mostrar por seleção (Todas ou marca) — a busca traz o pool
// completo (~400 modelos) pra cada marca render seu próprio top; a exibição
// corta aqui pra não virar lista infinita.
const LIMITE_DISPUTADOS = 20;
// Chips = só as marcas mais relevantes (o pool completo tem ~40 marcas).
const MAX_CHIPS_MARCA = 12;

function SecaoDisputados({ disputados }: { disputados: ItemDisputado[] }) {
  const [marcaAtiva, setMarcaAtiva] = useState("Todas");
  const [ordem, setOrdem] = useState<OrdemDisputado>("margem");

  const marcas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const item of disputados) {
      contagem.set(item.marca, (contagem.get(item.marca) ?? 0) + item.quantidade);
    }
    const ordenadas = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([marca]) => marca);
    return ["Todas", ...ordenadas.slice(0, MAX_CHIPS_MARCA)];
  }, [disputados]);

  const kmGlobal = Math.max(...disputados.map((item) => item.kmMax ?? 0), 1);

  // disputados já vem volume-desc da RPC. Corta o top por VOLUME (Todas = global;
  // marca = a própria marca) ANTES de ordenar pela métrica ativa — assim cada
  // marca entrega sua proporção, sem virar lista infinita nem trocar o recorte
  // quando muda o toggle.
  const filtrados = disputados.filter((item) => marcaAtiva === "Todas" || item.marca === marcaAtiva);
  const topVolume = filtrados.slice(0, LIMITE_DISPUTADOS);
  const ordenados = [...topVolume].sort((a, b) => {
    if (ordem === "margem") return (b.melhorMargem ?? 0) - (a.melhorMargem ?? 0);
    if (ordem === "km") return (b.kmMax ?? 0) - (a.kmMax ?? 0);
    return b.quantidade - a.quantidade;
  });
  const maxQtd = Math.max(...ordenados.map((i) => i.quantidade), 1);
  const maxMargem = Math.max(...ordenados.map((i) => i.melhorMargem ?? 0), 1);

  const rotuloCol2 = ordem === "margem" ? "Margem" : ordem === "km" ? "Faixa de KM (0–máx do país)" : "Volume de anúncios";
  const rotuloCol3 = ordem === "km" ? "KM mín–máx" : "Anúncios · margem";

  return (
    <section className="bia2-secao">
      <div className="bia2-secao-cabecalho">
        <div>
          <Eyebrow numero="03" texto="Concorrência" />
          <h2 className="bia2-titulo-secao">Modelos mais disputados</h2>
        </div>
        <Toggle
          opcoes={[
            { valor: "margem", rotulo: "Margem" },
            { valor: "km", rotulo: "Por KM" },
            { valor: "qtd", rotulo: "Volume" },
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
          <span>{rotuloCol2}</span>
          <span className="bia2-alinhar-direita">{rotuloCol3}</span>
        </div>
        {ordenados.map((item) => {
          const margemAlta = (item.melhorMargem ?? 0) >= 25;
          const temKm = item.kmMin !== null && item.kmMax !== null;
          const kmLeft = temKm ? ((item.kmMin as number) / kmGlobal) * 100 : 0;
          const kmW = temKm ? Math.max((((item.kmMax as number) - (item.kmMin as number)) / kmGlobal) * 100, 2) : 0;
          const percentual =
            ordem === "margem" ? ((item.melhorMargem ?? 0) / maxMargem) * 100 : (item.quantidade / maxQtd) * 100;
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

              <div className="bia2-disputado-barra">
                {ordem === "km" ? (
                  temKm ? (
                    <div className="bia2-km-trilho bia2-km-trilho-barra">
                      <div
                        className="bia2-km-fill"
                        style={{ left: `${kmLeft}%`, width: `${kmW}%`, background: corDaMarca(item.marca) }}
                      />
                    </div>
                  ) : (
                    <span className="bia2-km-vazio">sem dado de KM</span>
                  )
                ) : (
                  <BarraSimples percentual={percentual} cor={corDaMarca(item.marca)} alturaPx={18} />
                )}
              </div>

              <div className="bia2-disputado-valores">
                {ordem === "km" ? (
                  <span className="bia2-disputado-kmrange">
                    {temKm ? `${kmMil(item.kmMin as number)} – ${kmMil(item.kmMax as number)}` : "—"}
                  </span>
                ) : (
                  <>
                    <span className="bia2-disputado-qtd">{item.quantidade} un.</span>
                    <span className={margemAlta ? "bia2-badge-margem" : "bia2-margem-normal"}>
                      {item.melhorMargem !== null ? formatarPercentual1(item.melhorMargem) : "—"}
                    </span>
                  </>
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

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function mesAbrev(iso: string): string {
  // iso "2026-07-01" → "jul" (parse do "MM" pra não pegar fuso do new Date)
  const mm = Number(iso.slice(5, 7));
  return MESES_ABREV[mm - 1] ?? iso.slice(5, 7);
}

/** Seta/tom por direção da variação. */
function ChipVariacao({ tom, texto }: { tom: TomTendencia; texto: string }) {
  const seta = tom === "alta" ? "↑" : tom === "baixa" ? "↓" : "→";
  return <span className={`bia2-tend-chip bia2-tend-chip-${tom}`}>{seta} {texto}</span>;
}

function SecaoTendenciaMensal({ tendencias }: { tendencias: ItemTendenciaPrincipal[] }) {
  const mAtual = tendencias[0] ? mesAbrev(tendencias[0].mesAtual) : "";
  const mAnt = tendencias[0] ? mesAbrev(tendencias[0].mesAnterior) : "";

  return (
    <section className="bia2-secao">
      <Eyebrow numero="05" texto="Tendência mensal" />
      <h2 className="bia2-titulo-secao">Tendências do mês</h2>
      <p className="bia2-paragrafo-apoio">
        Como os principais modelos se moveram de{" "}
        <strong>{mAnt ? mAnt.toUpperCase() : "mês anterior"}</strong> para{" "}
        <strong>{mAtual ? mAtual.toUpperCase() : "este mês"}</strong> em oferta e margem — com a leitura
        da BIA sobre o que o comportamento sugere pra sua decisão de compra.
      </p>

      {tendencias.length === 0 ? (
        <div className="bia2-card">
          <div className="bia2-painel-hover-vazio">
            Ainda não há dois meses completos de histórico pra comparar — volte aqui no próximo mês.
          </div>
        </div>
      ) : (
        <div className="bia2-tend-grid">
          {tendencias.map((item) => {
            const a = analisarTendencia(item);
            const volAnt = Math.round(a.volAnterior);
            const volAtual = Math.round(a.volAtual);
            const volChip =
              a.volDeltaPct === null ? "novo" : `${Math.round(Math.abs(a.volDeltaPct))}%`;
            const margemChip =
              a.margemDeltaPp === null ? "—" : `${Math.abs(a.margemDeltaPp).toFixed(1)}pp`;
            return (
              <div key={`${item.marca}-${item.modelo}`} className="bia2-tend-card">
                <div className="bia2-tend-cabecalho">
                  <span
                    className="bia2-tend-ponto"
                    style={{ background: corDaMarca(item.marca), boxShadow: `0 0 8px ${corDaMarca(item.marca)}` }}
                  />
                  <span className="bia2-tend-modelo">{item.modelo}</span>
                  <span className="bia2-tend-marca">{item.marca}</span>
                </div>

                <div className="bia2-tend-stats">
                  <div className="bia2-tend-stat">
                    <span className="bia2-tend-stat-rotulo">Oferta média</span>
                    <span className="bia2-tend-stat-valor">
                      {volAnt} <span className="bia2-tend-seta">→</span>{" "}
                      <span>
                        {volAtual}
                        <span className="bia2-tend-sufixo"> un.</span>
                      </span>
                    </span>
                    <ChipVariacao tom={a.volTom} texto={volChip} />
                  </div>
                  <div className="bia2-tend-stat">
                    <span className="bia2-tend-stat-rotulo">Margem média</span>
                    <span className="bia2-tend-stat-valor">
                      {a.margemAnterior !== null ? (
                        <span>
                          {a.margemAnterior.toFixed(1)}
                          <span className="bia2-tend-sufixo">%</span>
                        </span>
                      ) : (
                        "—"
                      )}
                      <span className="bia2-tend-seta">→</span>
                      {a.margemAtual !== null ? (
                        <span>
                          {a.margemAtual.toFixed(1)}
                          <span className="bia2-tend-sufixo">%</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>
                    <ChipVariacao tom={a.margemTom} texto={margemChip} />
                  </div>
                </div>

                <p className="bia2-tend-msg">{a.mensagem}</p>
              </div>
            );
          })}
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
  tendencias,
  isAdmin,
}: {
  resumo: ResumoBia;
  descobertas7d: PontoSerie[];
  descobertas30d: PontoSerie[];
  valorPotencialHistorico: PontoValor[];
  maisDisputados: ItemDisputado[];
  marcasLuxo: ItemMarcaLuxo[];
  estadosAtivos: ItemEstadoAtivo[];
  cidadesAtivas: ItemCidadeAtiva[];
  tendencias: ItemTendenciaPrincipal[];
  /** Seções operacionais (throughput do motor, valor potencial) só pra admin. */
  isAdmin: boolean;
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
      <SecaoTendenciaMensal tendencias={tendencias} />

      {isAdmin && (
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
      )}

      {isAdmin && valorPotencialHistorico.length > 1 && (
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
