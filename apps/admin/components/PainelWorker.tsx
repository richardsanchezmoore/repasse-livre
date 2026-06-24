"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
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
}

export interface ConfigWorker {
  chave: string;
  valor: string;
}

const CAMPOS_CONFIG: Array<{ chave: string; rotulo: string; ajuda: string }> = [
  { chave: "OLX_CATEGORY_URL", rotulo: "URL(s) de categoria OLX", ajuda: "Uma ou mais, separadas por vírgula (uma por estado)." },
  { chave: "MODO_VARREDURA", rotulo: "Modo de varredura", ajuda: "inicial | incremental | intervalo" },
  { chave: "MARGEM_MINIMA_PERCENTUAL", rotulo: "Margem mínima (%)", ajuda: "Abaixo da FIPE para ser elegível." },
  { chave: "JANELA_INICIAL_DIAS", rotulo: "Janela inicial (dias)", ajuda: "Usado só no modo inicial." },
  { chave: "MAX_PAGINAS", rotulo: "Máx. de páginas por execução", ajuda: "Limite de proteção contra varredura sem fim." },
];

function extrairEstado(categoriaUrl: string): string {
  const match = categoriaUrl.match(/estado-([a-z]{2})/i);
  return match ? match[1].toUpperCase() : categoriaUrl;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

function formatarDuracao(inicio: string, fim: string | null): string {
  if (!fim) return "—";
  const segundos = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000);
  if (segundos < 60) return `${segundos}s`;
  return `${Math.floor(segundos / 60)}min ${segundos % 60}s`;
}

export function PainelWorker({ runs, configs }: { runs: RunWorker[]; configs: ConfigWorker[] }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [disparando, setDisparando] = useState(false);
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

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
            <Play size={16} strokeWidth={1.75} />
            {disparando ? "Disparando…" : "Disparar varredura agora"}
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
          <div className="usuarios-tabela-container">
            <table className="usuarios-tabela">
              <thead>
                <tr>
                  <th>Início</th>
                  <th>Estado</th>
                  <th>Modo</th>
                  <th>Status</th>
                  <th>Duração</th>
                  <th>Novos / Elegíveis / Descartados / Sem FIPE</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="usuarios-linha">
                    <td>{formatarData(run.iniciado_em)}</td>
                    <td>{extrairEstado(run.categoria_url)}</td>
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
                      {run.status === "erro"
                        ? run.erro_mensagem ?? "—"
                        : `${run.novos ?? "—"} / ${run.elegiveis ?? "—"} / ${run.descartados ?? "—"} / ${run.sem_fipe ?? "—"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
