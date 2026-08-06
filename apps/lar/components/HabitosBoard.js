"use client";
import { useState } from "react";
import { alternarHoje, addHabito, apagarHabito } from "@/app/habitos/actions";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];
const ICONES = ["💛", "💧", "🙏", "📖", "🚶‍♀️", "🌷", "😴", "🍎", "✍️", "🧘‍♀️"];

export default function HabitosBoard({ iniciais = [] }) {
  const [habitos, setHabitos] = useState(iniciais);
  const [abrir, setAbrir] = useState(false);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("💛");
  const hojeIdx = (new Date().getDay() + 6) % 7;

  async function toggle(h) {
    const feito = !h.feitoHoje;
    setHabitos((c) => c.map((x) => {
      if (x.id !== h.id) return x;
      const semana = [...x.semana]; semana[hojeIdx] = feito;
      return { ...x, feitoHoje: feito, semana, streak: feito ? x.streak + 1 : Math.max(0, x.streak - 1) };
    }));
    await alternarHoje(h.id);
  }
  async function add() {
    if (!nome.trim()) return;
    const r = await addHabito({ nome: nome.trim(), icone });
    if (r?.ok) { setHabitos((c) => [...c, { id: r.id, nome: nome.trim(), icone, feitoHoje: false, semana: [false, false, false, false, false, false, false], streak: 0 }]); setNome(""); setAbrir(false); }
  }
  async function apagar(h) {
    if (!confirm(`Tirar "${h.nome}" dos seus hábitos?`)) return;
    setHabitos((c) => c.filter((x) => x.id !== h.id));
    await apagarHabito(h.id);
  }

  const feitosHoje = habitos.filter((h) => h.feitoHoje).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="msg">Cuidar de você também é cuidar da casa. 💛 {habitos.length ? <>Hoje: <b>{feitosHoje}/{habitos.length}</b>.</> : null}</div>
      </div>

      {habitos.map((h) => (
        <div key={h.id} className="card habito-card">
          <button className={"habito-check" + (h.feitoHoje ? " on" : "")} onClick={() => toggle(h)} aria-label="marcar hoje">{h.icone}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="habito-nome">{h.nome}</div>
            <div className="habito-semana">
              {h.semana.map((ok, i) => <span key={i} className={"habito-dia" + (ok ? " ok" : "") + (i === hojeIdx ? " hoje" : "")}>{DIAS[i]}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            {h.streak > 0 && <div className="habito-streak">🔥 {h.streak}</div>}
            <button className="lista-x" onClick={() => apagar(h)} aria-label="apagar">✕</button>
          </div>
        </div>
      ))}

      {abrir ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div className="chips">
            {ICONES.map((i) => <button key={i} type="button" className={"chip" + (icone === i ? " on" : "")} style={{ fontSize: 18 }} onClick={() => setIcone(i)}>{i}</button>)}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="inp" style={{ flex: 1 }} value={nome} placeholder="Ex.: Tomar vitamina" autoFocus onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            <button className="btn" style={{ width: "auto", padding: "0 18px" }} onClick={add}>Criar</button>
          </div>
        </div>
      ) : (
        <button className="chip" onClick={() => setAbrir(true)} style={{ justifySelf: "start" }}>＋ Novo hábito</button>
      )}
    </div>
  );
}
