"use client";
import { useState } from "react";
import { addLembrete, concluirLembrete } from "@/app/listas/actions";

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hojeISO = () => isoDe(new Date());
const amanhaISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDe(d); };
function rotulo(data) {
  if (!data) return "";
  if (data === hojeISO()) return "hoje";
  if (data === amanhaISO()) return "amanhã";
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function LembretesBox({ iniciais = [] }) {
  const [lembretes, setLembretes] = useState(iniciais);
  const [texto, setTexto] = useState("");
  const [data, setData] = useState("");
  const [abrir, setAbrir] = useState(false);

  async function add() {
    const t = texto.trim(); if (!t) return;
    const r = await addLembrete({ texto: t, data: data || null });
    if (r?.ok) { setLembretes((c) => [...c, { id: r.id, texto: t, data: data || null }]); setTexto(""); setData(""); setAbrir(false); }
  }
  async function concluir(id) { setLembretes((c) => c.filter((l) => l.id !== id)); await concluirLembrete(id); }

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div className="c-k">🔔 Não esquecer</div>
      {lembretes.length === 0 && !abrir && <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Tudo em dia por aqui. 💛</p>}
      {lembretes.map((l) => (
        <div key={l.id} className="lembrete-item">
          <button className="lembrete-check" onClick={() => concluir(l.id)} aria-label="concluir">○</button>
          <span style={{ flex: 1 }}>{l.texto}</span>
          {l.data && <span className={"tag" + (l.data <= hojeISO() ? "" : " ghost")}>{rotulo(l.data)}</span>}
        </div>
      ))}
      {abrir ? (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <input className="inp" style={{ flex: 2 }} value={texto} placeholder="Ex.: comprar remédio…" autoFocus
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <input className="inp" style={{ flex: 1 }} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <button className="chip on" onClick={add}>+</button>
        </div>
      ) : (
        <button className="chip" onClick={() => setAbrir(true)} style={{ justifySelf: "start" }}>＋ Novo lembrete</button>
      )}
    </div>
  );
}
