"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { dispararVarreduraManual, salvarConfigWorker } from "@/app/actions";

export interface RunWorker {
  id: string;
  categoria_url: string;
  modo: string;
  status: "em_andamento" | "sucesso" | "erro";
  iniciado_em: string;
  finalizado_em: string | null;
  novos: number | null;
  elegiveis: number | null;
  descartados: number | null;
  sem_fipe: number | null;
  erro_mensagem: string | null;
  observacao: string | null;
}

export interface ConfigWorker {
  chave: string;
  valor: string;
}

export interface RegiaoFacebook {
  nome: string;
  url: string;
  uf: string;
}

/** Segmento do caminho /marketplace/<seg>/ — chave p/ casar um run FB com a região
 * do painel (a URL do run e a url base da região compartilham esse trecho). */
function segmentoMarketplace(url: string): string {
  return url.match(/marketplace\/([^/?]+)/i)?.[1]?.toLowerCase() ?? "";
}

const CAMPOS_CONFIG: Array<{ chave: string; rotulo: string; ajuda: string }> = [
  { chave: "OLX_CATEGORY_URL", rotulo: "URL(s) de categoria OLX", ajuda: "Uma ou mais, separadas por vírgula (uma por estado)." },
  { chave: "MODO_VARREDURA", rotulo: "Modo de varredura", ajuda: "inicial | incremental | intervalo" },
  { chave: "MARGEM_MINIMA_PERCENTUAL", rotulo: "Margem mínima (%)", ajuda: "Abaixo da FIPE para ser elegível." },
  {
    chave: "MARGEM_MAX_SUSPEITA",
    rotulo: "Margem máx. — descarte (%)",
    ajuda: "Acima disso = falso alarme (FIPE errada ou preço-parcela de financiado) → descarta. Vale p/ OLX/ML/Webmotors. Padrão 50. (O Facebook tem teto próprio, mais rígido, no Motor de Busca.)",
  },
  { chave: "JANELA_INICIAL_DIAS", rotulo: "Janela inicial (dias)", ajuda: "Usado só no modo inicial." },
  { chave: "MAX_PAGINAS", rotulo: "Máx. de páginas por execução", ajuda: "Limite de proteção contra varredura sem fim." },
  {
    chave: "JANELA_INICIO",
    rotulo: "Intervalo — início",
    ajuda: 'Usado só no modo intervalo. Data ISO, ex.: 2026-06-18T00:00:00-03:00.',
  },
  {
    chave: "JANELA_FIM",
    rotulo: "Intervalo — fim",
    ajuda: "Usado só no modo intervalo. Data ISO, mesma coisa.",
  },
];

type Fonte = "OLX" | "WEBMOTORS" | "MERCADO_LIVRE" | "FACEBOOK";

/** discovery_runs não tem coluna `fonte` — derivamos da categoria_url. */
function fonteDaUrl(categoriaUrl: string): Fonte {
  if (/webmotors/i.test(categoriaUrl)) return "WEBMOTORS";
  if (/mercadoli/i.test(categoriaUrl)) return "MERCADO_LIVRE"; // mercadolivre / mercadolibre
  if (/facebook/i.test(categoriaUrl)) return "FACEBOOK";
  return "OLX";
}

const ROTULO_FONTE: Record<Fonte, string> = {
  OLX: "OLX",
  WEBMOTORS: "Webmotors",
  MERCADO_LIVRE: "Mercado Livre",
  FACEBOOK: "Facebook",
};

const ORDEM_FONTES: Fonte[] = ["OLX", "WEBMOTORS", "MERCADO_LIVRE", "FACEBOOK"];

function extrairEstado(categoriaUrl: string): string {
  // OLX varre por estado; FB por região (rótulo na URL /marketplace/<regiao>/); ML/Webmotors nacionais.
  if (fonteDaUrl(categoriaUrl) === "FACEBOOK") {
    const reg = categoriaUrl.match(/marketplace\/([a-z0-9-]+)\//i);
    return reg ? reg[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Regional";
  }
  if (fonteDaUrl(categoriaUrl) !== "OLX") return "Nacional";
  const match = categoriaUrl.match(/estado-([a-z]{2})/i);
  return match ? match[1].toUpperCase() : "—";
}

function formatarData(iso: string): string {
  // timeZone fixo evita mismatch de hidratação entre server (UTC na Vercel)
  // e cliente (horário de Brasília) — mesmo bug corrigido em formatadores.ts.
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatarDuracao(inicio: string, fim: string | null): string {
  if (!fim) return "—";
  const segundos = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000);
  if (segundos < 60) return `${segundos}s`;
  return `${Math.floor(segundos / 60)}min ${segundos % 60}s`;
}

export function PainelWorker({
  runs,
  configs,
  regioesFacebook = [],
}: {
  runs: RunWorker[];
  configs: ConfigWorker[];
  regioesFacebook?: RegiaoFacebook[];
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [disparando, setDisparando] = useState(false);
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ufFbSel, setUfFbSel] = useState<string | null>(null); // sub-aba de estado (aba Facebook)

  useEffect(() => {
    if (!disparando) return;
    setSegundosDecorridos(0);
    const intervalo = setInterval(() => setSegundosDecorridos((s) => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, [disparando]);

  // Abas por fonte: quais fontes têm run + qual começa ativa (OLX, a principal,
  // quando presente; senão a primeira disponível).
  const fontesPresentes = ORDEM_FONTES.filter((f) => runs.some((r) => fonteDaUrl(r.categoria_url) === f));
  const [abaAtiva, setAbaAtiva] = useState<Fonte>(fontesPresentes[0] ?? "OLX");
  const runsDaAba = runs.filter((r) => fonteDaUrl(r.categoria_url) === abaAtiva);

  // Facebook: cada run é a execução de UMA região (cidade). Cruzamos o segmento
  // /marketplace/<seg>/ do run com as regiões do painel pra recuperar UF + nome
  // (a URL do run não carrega o estado) e agrupar o histórico por estado.
  const mapaRegiao = useMemo(() => {
    const m = new Map<string, { uf: string; nome: string }>();
    for (const r of regioesFacebook) {
      const seg = segmentoMarketplace(r.url);
      if (seg) m.set(seg, { uf: r.uf, nome: r.nome });
    }
    return m;
  }, [regioesFacebook]);
  const regiaoDoRun = (run: RunWorker) => mapaRegiao.get(segmentoMarketplace(run.categoria_url));

  // Grupos por UF (só na aba Facebook), "sem estado" por último.
  const gruposFacebook = useMemo(() => {
    if (abaAtiva !== "FACEBOOK") return [] as Array<[string, RunWorker[]]>;
    const m = new Map<string, RunWorker[]>();
    for (const run of runsDaAba) {
      const uf = regiaoDoRun(run)?.uf || "—";
      const lista = m.get(uf) ?? [];
      lista.push(run);
      m.set(uf, lista);
    }
    return [...m.entries()].sort(([a], [b]) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, runsDaAba, mapaRegiao]);

  // Sub-aba de estado ativa (aba Facebook): a selecionada, se ainda existe; senão a 1ª.
  const ufsFacebook = gruposFacebook.map(([uf]) => uf);
  const ufFbAtiva = ufFbSel && ufsFacebook.includes(ufFbSel) ? ufFbSel : ufsFacebook[0] ?? null;
  const runsUfFb = gruposFacebook.find(([uf]) => uf === ufFbAtiva)?.[1] ?? [];

  const linhaRun = (run: RunWorker, celulaEstado: string) => (
    <tr key={run.id} className="usuarios-linha">
      <td>{formatarData(run.iniciado_em)}</td>
      <td>{celulaEstado}</td>
      <td>{run.modo}</td>
      <td>
        <span
          className={`worker-selo worker-selo-${run.status === "sucesso" ? "sucesso" : run.status === "erro" ? "erro" : "andamento"}`}
          title={run.erro_mensagem ?? undefined}
        >
          {run.status === "sucesso" ? "Sucesso" : run.status === "erro" ? "Erro" : "Em andamento"}
        </span>
      </td>
      <td>{formatarDuracao(run.iniciado_em, run.finalizado_em)}</td>
      <td>
        {run.status === "erro" ? (
          run.erro_mensagem ?? "—"
        ) : (
          <>
            {`${run.novos ?? "—"} / ${run.elegiveis ?? "—"} / ${run.descartados ?? "—"} / ${run.sem_fipe ?? "—"}`}
            {run.observacao ? (
              <span className="worker-obs" style={{ display: "block", fontSize: "0.8em", opacity: 0.7 }}>
                {run.observacao}
              </span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  );

  const valorAtual = (chave: string): string => configs.find((c) => c.chave === chave)?.valor ?? "";
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(CAMPOS_CONFIG.map((c) => [c.chave, valorAtual(c.chave)]))
  );

  function salvarCampo(chave: string) {
    setErro(null);
    setMensagem(null);
    setSalvandoChave(chave);
    iniciarTransicao(async () => {
      try {
        await salvarConfigWorker(chave, valores[chave] ?? "");
        setMensagem(`Config "${chave}" salva.`);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao salvar config.");
      } finally {
        setSalvandoChave(null);
      }
    });
  }

  function dispararAgora() {
    setErro(null);
    setMensagem(null);
    setDisparando(true);
    iniciarTransicao(async () => {
      try {
        await dispararVarreduraManual();
        setMensagem("Varredura disparada — pode levar alguns minutos para aparecer no histórico.");
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao disparar varredura.");
      } finally {
        setDisparando(false);
      }
    });
  }

  return (
    <div className="worker-painel">
      {erro && <p className="campo-erro">{erro}</p>}
      {mensagem && <p className="worker-mensagem">{mensagem}</p>}

      <section className="worker-secao">
        <div className="worker-secao-cabecalho">
          <h2 className="worker-secao-titulo">Disparo manual</h2>
          <button type="button" className="worker-botao-disparar" disabled={disparando} onClick={dispararAgora}>
            {disparando ? (
              <Loader2 size={16} strokeWidth={1.75} className="worker-spinner" />
            ) : (
              <Play size={16} strokeWidth={1.75} />
            )}
            {disparando ? `Disparando… (${segundosDecorridos}s)` : "Disparar varredura agora"}
          </button>
        </div>
      </section>

      <section className="worker-secao">
        <h2 className="worker-secao-titulo">Configuração</h2>
        <div className="worker-config-grade">
          {CAMPOS_CONFIG.map((campo) => (
            <div key={campo.chave} className="worker-config-campo">
              <label className="worker-config-rotulo" htmlFor={`config-${campo.chave}`}>
                {campo.rotulo}
              </label>
              <div className="worker-config-linha">
                <input
                  id={`config-${campo.chave}`}
                  type="text"
                  className="worker-config-input"
                  value={valores[campo.chave] ?? ""}
                  onChange={(evento) =>
                    setValores((anterior) => ({ ...anterior, [campo.chave]: evento.target.value }))
                  }
                />
                <button
                  type="button"
                  className="worker-config-salvar"
                  disabled={pendente && salvandoChave === campo.chave}
                  onClick={() => salvarCampo(campo.chave)}
                >
                  {pendente && salvandoChave === campo.chave ? "Salvando…" : "Salvar"}
                </button>
              </div>
              <p className="worker-config-ajuda">{campo.ajuda}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="worker-secao">
        <h2 className="worker-secao-titulo">Histórico de varreduras</h2>
        {runs.length === 0 ? (
          <p className="usuarios-subtitulo">Nenhuma varredura registrada ainda.</p>
        ) : (
          <>
            <div className="worker-abas" role="tablist">
              {fontesPresentes.map((fonte) => (
                <button
                  key={fonte}
                  type="button"
                  role="tab"
                  aria-selected={abaAtiva === fonte}
                  className={`worker-aba${abaAtiva === fonte ? " worker-aba-ativa" : ""}`}
                  onClick={() => setAbaAtiva(fonte)}
                >
                  {ROTULO_FONTE[fonte]}
                </button>
              ))}
            </div>
            {abaAtiva === "FACEBOOK" && ufsFacebook.length > 0 && (
              <div className="worker-abas worker-abas-estado" role="tablist">
                {gruposFacebook.map(([uf, runsUf]) => (
                  <button
                    key={uf}
                    type="button"
                    role="tab"
                    aria-selected={uf === ufFbAtiva}
                    className={`worker-aba worker-aba-estado${uf === ufFbAtiva ? " worker-aba-ativa" : ""}`}
                    onClick={() => setUfFbSel(uf)}
                  >
                    {uf === "—" ? "Sem estado" : uf} <span style={{ opacity: 0.7, fontWeight: 500 }}>({runsUf.length})</span>
                  </button>
                ))}
              </div>
            )}
            <div className="usuarios-tabela-container">
            <table className="usuarios-tabela">
              <thead>
                <tr>
                  <th>Início</th>
                  <th>{abaAtiva === "FACEBOOK" ? "Região" : "Estado"}</th>
                  <th>Modo</th>
                  <th>Status</th>
                  <th>Duração</th>
                  <th>Novos / Elegíveis / Descartados / Sem FIPE</th>
                </tr>
              </thead>
              {abaAtiva === "FACEBOOK" ? (
                <tbody>{runsUfFb.map((run) => linhaRun(run, regiaoDoRun(run)?.nome || extrairEstado(run.categoria_url)))}</tbody>
              ) : (
                <tbody>{runsDaAba.map((run) => linhaRun(run, extrairEstado(run.categoria_url)))}</tbody>
              )}
            </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
