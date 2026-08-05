"use client";
import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function FinancasTool() {
  const [renda, setRenda] = useState("");
  const [dizimoOn, setDizimoOn] = useState(true);
  const [gastos, setGastos] = useState([{ nome: "", valor: "" }]);
  const [marta, setMarta] = useState(null);
  const [busy, setBusy] = useState(false);

  const setG = (i, c, v) => setGastos((cur) => cur.map((g, j) => (j === i ? { ...g, [c]: v } : g)));
  const add = () => setGastos((c) => [...c, { nome: "", valor: "" }]);
  const del = (i) => setGastos((c) => c.filter((_, j) => j !== i));

  // números determinísticos
  const rendaN = Math.max(0, Math.round(+renda || 0));
  const dizimo = dizimoOn ? Math.round(rendaN * 0.1) : 0;
  const totalGastos = gastos.reduce((s, g) => s + Math.max(0, Math.round(+g.valor || 0)), 0);
  const sobra = rendaN - dizimo - totalGastos;

  async function pedirPalavra() {
    setBusy(true); setMarta(null);
    try {
      const r = await fetch(BASE + "/api/marta/financas", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ renda: rendaN, dizimo, gastos: totalGastos, sobra }),
      });
      const d = await r.json();
      if (d.ok) setMarta(d);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="msg">Vamos pôr as contas da casa no lugar, com <b>paz</b>. Eu não invento número nenhum — só te ajudo a enxergar e a respirar. 💛</div>
      </div>

      <div className="card">
        <div className="field">
          <label>Renda do mês (da casa)</label>
          <input className="inp" type="number" inputMode="numeric" value={renda} onChange={(e) => setRenda(e.target.value)} placeholder="Ex.: 4500" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Separar o dízimo (10%)?</label>
          <div className="chips">
            <button type="button" className={"chip" + (dizimoOn ? " on" : "")} onClick={() => setDizimoOn(true)}>Sim</button>
            <button type="button" className={"chip" + (!dizimoOn ? " on" : "")} onClick={() => setDizimoOn(false)}>Agora não</button>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 8 }}><label>Gastos do mês</label></div>
        {gastos.map((g, i) => (
          <div key={i} className="row" style={{ marginBottom: 8, alignItems: "center" }}>
            <input className="inp" style={{ flex: 2 }} value={g.nome} onChange={(e) => setG(i, "nome", e.target.value)} placeholder="Ex.: aluguel, mercado…" />
            <input className="inp" style={{ flex: 1 }} type="number" inputMode="numeric" value={g.valor} onChange={(e) => setG(i, "valor", e.target.value)} placeholder="R$" />
            {gastos.length > 1 && <button type="button" className="chip" style={{ flex: "none" }} onClick={() => del(i)}>✕</button>}
          </div>
        ))}
        <button type="button" className="chip" onClick={add}>＋ adicionar gasto</button>
      </div>

      {/* resumo determinístico */}
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>O mês da sua casa</div>
        {[["Renda", rendaN, "var(--ink)"], dizimoOn && ["Dízimo (10%)", -dizimo, "var(--sage-deep)"], ["Gastos", -totalGastos, "var(--ink-soft)"]].filter(Boolean).map(([k, v, cor], i) => (
          <div key={i} className="stat" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
            <span>{k}</span><span style={{ fontWeight: 700, color: cor }}>{v < 0 ? "− " : ""}{brl(Math.abs(v))}</span>
          </div>
        ))}
        <div className="stat" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 2px", borderTop: "2px solid var(--line)", marginTop: 4 }}>
          <span style={{ fontWeight: 800 }}>Sobra do mês</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: sobra >= 0 ? "var(--ok)" : "var(--clay-deep)" }}>{brl(sobra)}</span>
        </div>
      </div>

      <button className="btn" onClick={pedirPalavra} disabled={busy || !rendaN}>{busy ? "Um instante…" : "🙏 Pedir uma palavra à Marta"}</button>

      {marta && (
        <>
          {marta.recado && <div className="recado">“{marta.recado}” <br /><span className="muted">— Marta</span></div>}
          {marta.dicas?.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Dicas da Marta</div>
              {marta.dicas.map((d, i) => (
                <div key={i} className="meal" style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                  <div className="when">✦</div><div className="name" style={{ fontWeight: 500 }}>{d}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
