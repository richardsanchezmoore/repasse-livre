"use client";
import { useState, useEffect } from "react";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function CasaPlanner() {
  const [comodos, setComodos] = useState("");
  const [ajudaMarido, setAjudaMarido] = useState(true);
  const [tempo, setTempo] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(null);
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  async function montar() {
    setErro(""); setBusy(true); setRes(null);
    try {
      const r = await fetch(BASE + "/api/marta/casa", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ comodos, ajudaMarido, tempo }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui montar agora."); return; }
      setRes(d);
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  function montarFala() {
    if (!res) return "";
    const p = [];
    if (res.recado) p.push(res.recado);
    if (res.semana?.length) {
      p.push("A sua semana de faxina.");
      res.semana.forEach((s) => p.push(`${s.dia}: foco em ${s.foco}.`));
    }
    return p.join(" ");
  }
  function ouvir() {
    if (falando) { pararFala(); setFalando(false); return; }
    falar(montarFala(), { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!res && !busy && (
        <>
          <div className="marta-hi">
            <div className="av">M</div>
            <div className="msg">Nada de faxinar a casa toda num dia só. Eu monto uma <b>rotina leve</b> — um foco por dia — e divido as tarefas entre todos. Você não faz tudo sozinha.</div>
          </div>
          <div className="card">
            <div className="field">
              <label>Como é a sua casa? <span className="hint">(cômodos principais)</span></label>
              <input className="inp" value={comodos} onChange={(e) => setComodos(e.target.value)} placeholder="Ex.: sala, cozinha, 2 banheiros, 3 quartos, área" />
            </div>
            <div className="field">
              <label>O marido ajuda nas tarefas?</label>
              <div className="chips">
                <button type="button" className={"chip" + (ajudaMarido ? " on" : "")} onClick={() => setAjudaMarido(true)}>Sim</button>
                <button type="button" className={"chip" + (!ajudaMarido ? " on" : "")} onClick={() => setAjudaMarido(false)}>Por enquanto, não</button>
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Quanto tempo por dia?</label>
              <div className="tabs">
                <button className={tempo === "pouco" ? "on" : ""} onClick={() => setTempo("pouco")}>Pouco</button>
                <button className={tempo === "normal" ? "on" : ""} onClick={() => setTempo("normal")}>Uma boa janela</button>
              </div>
            </div>
          </div>
          <button className="btn" onClick={montar} disabled={busy}>🧹 Montar a minha rotina</button>
          {erro && <p className="erro">{erro}</p>}
        </>
      )}

      {busy && (<div className="loading"><div className="spin" /><p className="muted">A Marta está montando uma rotina leve e dividindo as tarefas com justiça…</p></div>)}

      {res && !busy && (
        <>
          {res.recado && <div className="recado">“{res.recado}” <br /><span className="muted">— Marta</span></div>}
          {temVoz && (
            <button className={"btn" + (falando ? "" : " ghost")} onClick={ouvir}
              style={falando ? {} : { color: "var(--sage-deep)", borderColor: "var(--sage)" }}>
              {falando ? "⏹ Parar a Marta" : "🔊 Ouvir a Marta"}
            </button>
          )}

          {res.diarias?.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Todo dia (rapidinho)</div>
              {res.diarias.map((t, i) => (
                <div key={i} className="meal" style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                  <div><div className="name">{t.tarefa}</div><div className="ings">👤 {t.quem}</div></div>
                </div>
              ))}
            </div>
          )}

          {res.semana?.length > 0 && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>A faxina rotativa</div>
              <div className="week">
                {res.semana.map((s, i) => (
                  <div key={i} className="day">
                    <div className="dh">{s.dia} · {s.foco}</div>
                    {s.tarefas?.map((t, j) => (
                      <div key={j} className="meal"><div className="when" /><div><div className="name">{t.tarefa}</div><div className="ings">👤 {t.quem}</div></div></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {res.resgate?.length > 0 && (
            <div className="card" style={{ borderColor: "var(--clay)" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>🚨 Plano de Resgate (~30 min)</div>
              {res.resgate.map((t, i) => (
                <div key={i} className="item" style={{ cursor: "default" }}>
                  <span className="box" /><span className="nm">{t.tarefa}</span><span className="q">{t.minutos} min</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn ghost" onClick={() => setRes(null)}>↺ Montar de novo</button>
        </>
      )}
    </div>
  );
}
