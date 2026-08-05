"use client";
import { useState } from "react";
import Link from "next/link";
import { salvarPlacar } from "@/app/filhos/actions";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const META = 12; // estrelas p/ liberar a 1ª recompensa

export default function FilhosBoard({ logado = false, filhosIniciais, salva = null }) {
  const temFamilia = Array.isArray(filhosIniciais) && filhosIniciais.length > 0;
  const [filhos, setFilhos] = useState(temFamilia ? filhosIniciais : [{ nome: "", idade: "" }]);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(salva?.dados || null);
  const [estrelas, setEstrelas] = useState(salva?.marcados || {}); // chave "ci-hi" -> bool

  function toggle(chave) {
    setEstrelas((e) => {
      const novo = { ...e, [chave]: !e[chave] };
      if (logado) salvarPlacar({ dados: res, marcados: novo, estrelas: Object.values(novo).filter(Boolean).length });
      return novo;
    });
  }

  const setF = (i, c, v) => setFilhos((cur) => cur.map((f, j) => (j === i ? { ...f, [c]: v } : f)));
  const add = () => setFilhos((c) => [...c, { nome: "", idade: "" }]);
  const del = (i) => setFilhos((c) => c.filter((_, j) => j !== i));

  async function sugerir() {
    setErro(""); setBusy(true); setRes(null); setEstrelas({});
    try {
      const r = await fetch(BASE + "/api/marta/filhos", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ filhos: filhos.map((f) => ({ nome: f.nome, idade: f.idade === "" ? null : Number(f.idade) })) }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui montar agora."); return; }
      setRes(d); setEstrelas({});
      if (logado) salvarPlacar({ dados: d, marcados: {}, estrelas: 0 });
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  const total = Object.values(estrelas).filter(Boolean).length;
  const liberou = total >= META;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!res && !busy && (
        <>
          <div className="marta-hi">
            <div className="av">M</div>
            <div className="msg">Vou sugerir <b>virtudes e hábitos</b> pra cada filho, do jeitinho da idade. E o placar de estrelas vira <b>passeio em família</b> — recompensa que tira da tela, não que prende. 💛</div>
          </div>
          <div className="card">
            <div className="field" style={{ marginBottom: 8 }}><label>Seus filhos</label></div>
            {filhos.map((f, i) => (
              <div key={i} className="row" style={{ marginBottom: 8, alignItems: "center" }}>
                <input className="inp" style={{ flex: 2 }} value={f.nome} onChange={(e) => setF(i, "nome", e.target.value)} placeholder="Nome" />
                <input className="inp" style={{ flex: 1 }} type="number" min="0" max="18" value={f.idade} onChange={(e) => setF(i, "idade", e.target.value)} placeholder="Idade" />
                {filhos.length > 1 && <button type="button" className="chip" style={{ flex: "none" }} onClick={() => del(i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="chip" onClick={add}>＋ adicionar filho</button>
          </div>
          <button className="btn" onClick={sugerir} disabled={busy}>🧒 Sugerir virtudes & montar o placar</button>
          {erro && <p className="erro">{erro}</p>}
        </>
      )}

      {busy && (<div className="loading"><div className="spin" /><p className="muted">A Marta está pensando com carinho nas virtudes de cada criança…</p></div>)}

      {res && !busy && (
        <>
          {res.recado && <div className="recado">“{res.recado}” <br /><span className="muted">— Marta</span></div>}

          {/* placar */}
          <div className="card" style={{ textAlign: "center", borderColor: liberou ? "var(--sage)" : "var(--line)" }}>
            <div className="eyebrow">Placar da família</div>
            <div style={{ font: "800 34px var(--ui)", color: "var(--clay)", margin: "6px 0" }}>⭐ {total} <span className="muted" style={{ fontSize: 15 }}>/ {META}</span></div>
            {liberou
              ? <div style={{ color: "var(--sage-deep)", fontWeight: 700 }}>🎉 Recompensa liberada! Escolham juntos:</div>
              : <div className="muted">Marquem os hábitos cumpridos. Ao chegar em {META} estrelas, vale uma recompensa em família.</div>}
          </div>

          {res.criancas.map((c, ci) => (
            <div key={ci} className="card">
              <div className="mod" style={{ border: 0, padding: 0, minHeight: 0, marginBottom: 8 }}>
                <div className="t" style={{ fontSize: 17 }}>{c.nome} <span className="muted" style={{ fontWeight: 400 }}>· {c.idade} anos</span></div>
                <span className="tag viva" style={{ alignSelf: "flex-start" }}>Virtude: {c.virtude}</span>
              </div>
              {(c.habitos || []).map((h, hi) => {
                const chave = ci + "-" + hi;
                const on = !!estrelas[chave];
                return (
                  <div key={hi} className={"item" + (on ? " done" : "")} onClick={() => toggle(chave)}>
                    <span className="box">{on ? "⭐" : ""}</span><span className="nm">{h}</span>
                  </div>
                );
              })}
              {c.principio && <p className="muted" style={{ marginTop: 6 }}>✦ {c.principio}</p>}
            </div>
          ))}

          {res.recompensas?.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>🎁 Recompensas (experiências, não tela)</div>
              {res.recompensas.map((r, i) => (
                <div key={i} className="item" style={{ cursor: "default", opacity: liberou ? 1 : 0.6 }}>
                  <span className="box">{liberou ? "🎉" : "🔒"}</span><span className="nm">{r}</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn ghost" onClick={() => setRes(null)}>↺ Refazer</button>
          {logado
            ? <p className="muted" style={{ textAlign: "center" }}>As estrelas ficam salvas e zeram toda segunda — recomeço leve. 💛</p>
            : <Link href="/entrar" className="btn" style={{ textDecoration: "none" }}>💾 Criar conta pra guardar o placar</Link>}
        </>
      )}
    </div>
  );
}
