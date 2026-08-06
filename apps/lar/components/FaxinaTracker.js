"use client";
import { useState } from "react";
import { marcarTarefa } from "@/app/casa/faxinaActions";
import CompartilharWhats from "@/components/CompartilharWhats";

const COR = { verde: "#4e8a5f", amarelo: "#c08a2e", vermelho: "#c23b34" };
const ENERGIA = [
  { k: "rapido", t: "Rapidinho", min: 15, ic: "⚡" },
  { k: "normal", t: "Tenho um tempo", min: 30, ic: "🕐" },
  { k: "caprichar", t: "Vou caprichar", min: 60, ic: "💪" },
];

export default function FaxinaTracker({ comodos: comodosIniciais = [], minutosSemana = 0, familia = null, logado = false }) {
  const [comodos, setComodos] = useState(comodosIniciais);
  const [minutos, setMinutos] = useState(minutosSemana);
  const [energia, setEnergia] = useState(null);
  const [aberto, setAberto] = useState(null); // cômodo expandido

  const todas = comodos.flatMap((c) => c.tarefas.map((t) => ({ ...t, comodoNome: c.nome, comodoIcone: c.icone })));

  function montarLista(budget) {
    const devidas = todas.filter((t) => t.nivel !== "verde").sort((a, b) => b.urgencia - a.urgencia);
    const escolhidas = []; let soma = 0;
    for (const t of devidas) { if (soma >= budget && escolhidas.length) break; escolhidas.push(t); soma += t.minutos; }
    return escolhidas;
  }
  const listaDia = energia ? montarLista(ENERGIA.find((e) => e.k === energia).min) : [];

  async function marcar(t) {
    // otimista: vira verde, sai da lista, soma minutos
    setComodos((cs) => cs.map((c) => ({
      ...c,
      tarefas: c.tarefas.map((x) => (x.id === t.id ? { ...x, nivel: "verde", urgencia: -x.freq_dias } : x)),
    })).map((c) => ({ ...c, nivel: c.tarefas.some((x) => x.nivel === "vermelho") ? "vermelho" : c.tarefas.some((x) => x.nivel === "amarelo") ? "amarelo" : "verde" })));
    setMinutos((m) => m + (t.minutos || 0));
    const r = await marcarTarefa(t.id);
    if (r?.minutosSemana != null) setMinutos(r.minutosSemana);
  }

  const textoWhats = listaDia.length
    ? `🧹 *Faxina de hoje* — pela Marta:\n${listaDia.map((t) => `• ${t.comodoIcone} ${t.nome} (${t.minutos} min)`).join("\n")}`
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {minutos > 0 && (
        <div className="recado" style={{ borderLeftColor: "var(--sage)" }}>💪 Você já cuidou <b>{minutos} min</b> da casa essa semana. Orgulho de você!</div>
      )}

      {/* Lista do dia por energia */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="c-k">🧹 A faxina de hoje</div>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Quanto pique você tem hoje? Eu monto a lista do tamanho da sua energia.</p>
        <div className="chips">
          {ENERGIA.map((e) => (
            <button key={e.k} type="button" className={"chip" + (energia === e.k ? " on" : "")} onClick={() => setEnergia(e.k)}>{e.ic} {e.t} <span className="opt">~{e.min}min</span></button>
          ))}
        </div>
        {energia && (
          listaDia.length === 0
            ? <p className="muted" style={{ margin: "4px 0 0" }}>Tá tudo em dia! Aproveita e descansa. 💛</p>
            : (
              <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
                {listaDia.map((t) => (
                  <div key={t.id} className="fx-tarefa" style={{ borderLeftColor: COR[t.nivel] }}>
                    <button className="fx-check" onClick={() => marcar(t)} aria-label="feito">○</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fx-nome">{t.comodoIcone} {t.nome}</div>
                      <div className="opt" style={{ fontSize: 11.5 }}>{t.comodoNome} · {t.minutos} min</div>
                    </div>
                  </div>
                ))}
                {textoWhats && <CompartilharWhats texto={textoWhats} familia={familia} logado={logado} label="Dividir a faxina no WhatsApp" />}
              </div>
            )
        )}
      </div>

      {/* Cômodos (estado persistente) */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Os seus cômodos</div>
        <div style={{ display: "grid", gap: 8 }}>
          {comodos.map((c) => (
            <div key={c.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <button className="fx-comodo" onClick={() => setAberto(aberto === c.id ? null : c.id)}>
                <span className="fx-bola" style={{ background: COR[c.nivel] }} />
                <span className="fx-comodo-nome">{c.icone} {c.nome}</span>
                <span className="opt">{c.tarefas.filter((t) => t.nivel !== "verde").length ? `${c.tarefas.filter((t) => t.nivel !== "verde").length} pra fazer` : "em dia 💛"}</span>
                <span className={"devoc-chev" + (aberto === c.id ? " up" : "")}>⌄</span>
              </button>
              {aberto === c.id && (
                <div style={{ padding: "0 14px 12px", display: "grid", gap: 6 }}>
                  {c.tarefas.map((t) => (
                    <div key={t.id} className="fx-tarefa" style={{ borderLeftColor: COR[t.nivel] }}>
                      <button className="fx-check" onClick={() => marcar(t)} aria-label="feito">○</button>
                      <div style={{ flex: 1 }}>
                        <div className="fx-nome">{t.nome}</div>
                        <div className="opt" style={{ fontSize: 11.5 }}>a cada {t.freq_dias}d · {t.minutos} min</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
