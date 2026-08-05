"use client";
import { useState, useEffect } from "react";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";
import { salvarRotina } from "@/app/casa/actions";
import { Stepper, ChipsMulti } from "@/components/ui";
import CompartilharWhats from "@/components/CompartilharWhats";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function CasaPlanner({ logado = false, salva = null, familia = null }) {
  const [quartos, setQuartos] = useState(2);
  const [banheiros, setBanheiros] = useState(1);
  const [areas, setAreas] = useState("");
  const [ajudaMarido, setAjudaMarido] = useState(true);
  const [tempo, setTempo] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(salva || null);
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(!!salva);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  async function montar() {
    setErro(""); setBusy(true); setRes(null);
    try {
      const comodos = `${quartos} ${quartos === 1 ? "quarto" : "quartos"}, ${banheiros} ${banheiros === 1 ? "banheiro" : "banheiros"}${areas ? ", " + areas : ""}`;
      const r = await fetch(BASE + "/api/marta/casa", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ comodos, ajudaMarido, tempo }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui montar agora."); return; }
      setRes(d); setSalvo(false);
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  async function salvar() {
    if (!res || salvando || salvo) return;
    setSalvando(true);
    try {
      const { diarias, semana, resgate, recado } = res;
      const r = await salvarRotina({ diarias, semana, resgate, recado });
      if (r?.ok) setSalvo(true); else alert(r?.erro || "Não consegui salvar agora.");
    } finally { setSalvando(false); }
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

  // Texto pra mandar no WhatsApp (dividir as tarefas com marido e filhos).
  function montarTextoWhats() {
    if (!res) return "";
    const L = ["🧹 *Rotina da casa* — pela Marta"];
    if (res.diarias?.length) {
      L.push("", "*Todo dia (rapidinho):*");
      res.diarias.forEach((t) => L.push(`• ${t.tarefa}${t.quem ? ` — ${t.quem}` : ""}`));
    }
    if (res.semana?.length) {
      L.push("", "*Faxina da semana:*");
      res.semana.forEach((s) => {
        L.push(`*${s.dia}* — ${s.foco}`);
        (s.tarefas || []).forEach((t) => L.push(`• ${t.tarefa}${t.quem ? ` — ${t.quem}` : ""}`));
      });
    }
    return L.join("\n");
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
              <label>Quantos quartos e banheiros?</label>
              <div className="row" style={{ gap: 16 }}>
                <div style={{ flex: "none" }}><div className="hint" style={{ marginBottom: 5 }}>Quartos</div><Stepper value={quartos} onChange={setQuartos} min={1} max={8} /></div>
                <div style={{ flex: "none" }}><div className="hint" style={{ marginBottom: 5 }}>Banheiros</div><Stepper value={banheiros} onChange={setBanheiros} min={1} max={6} /></div>
              </div>
            </div>
            <div className="field">
              <label>Quais áreas a casa tem?</label>
              <ChipsMulti onChange={setAreas} outroLabel="Outra"
                opcoes={["Sala", "Cozinha", "Área de serviço", "Quintal", "Escritório", "Varanda", "Garagem"]} />
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

          <CompartilharWhats texto={montarTextoWhats()} familia={familia} logado={logado} label="Enviar tarefas no WhatsApp" />

          {logado ? (
            <button className="btn" onClick={salvar} disabled={salvando || salvo}>
              {salvo ? "✓ Rotina salva" : salvando ? "Salvando…" : "💾 Salvar esta rotina"}
            </button>
          ) : (
            <a href={BASE + "/entrar"} className="btn" style={{ textDecoration: "none" }}>💾 Criar conta pra salvar</a>
          )}
          <button className="btn ghost" onClick={() => { setRes(null); setSalvo(false); }}>↺ Montar de novo</button>
          <a href={BASE + "/"} className="btn ghost" style={{ textDecoration: "none" }}>🏠 Voltar pro início · falar com a Marta</a>
        </>
      )}
    </div>
  );
}
