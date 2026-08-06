"use client";
import { useState, useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ListaPublica({ token, itensIniciais = [] }) {
  const [itens, setItens] = useState(itensIniciais);
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    try { setNome(localStorage.getItem("lar_lista_nome") || ""); } catch {}
    const recarregar = async () => {
      if (document.visibilityState !== "visible") return;
      try { const d = await fetch(BASE + "/api/lista/" + token, { cache: "no-store" }).then((r) => r.json()); if (d?.ok) setItens(d.itens); } catch {}
    };
    document.addEventListener("visibilitychange", recarregar);
    return () => document.removeEventListener("visibilitychange", recarregar);
  }, [token]);

  function salvarNome(v) { setNome(v); try { localStorage.setItem("lar_lista_nome", v); } catch {} }
  const api = (body) => fetch(BASE + "/api/lista/" + token, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null);

  async function toggle(it) {
    setItens((c) => c.map((x) => (x.id === it.id ? { ...x, feito: !x.feito, feito_por: !x.feito ? (nome || "Família") : null } : x)));
    await api({ acao: "toggle", id: it.id, feito: !it.feito, quem: nome });
  }
  async function add() {
    const t = texto.trim(); if (!t) return;
    const r = await api({ acao: "add", texto: t });
    if (r?.ok) { setItens((c) => [...c, { id: r.id, texto: t, feito: false }]); setTexto(""); }
  }

  const pend = itens.filter((i) => !i.feito), feitos = itens.filter((i) => i.feito);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <span className="opt" style={{ flex: "none" }}>Sou:</span>
        <input className="inp" style={{ flex: 1 }} value={nome} placeholder="seu nome (ex: João)" onChange={(e) => salvarNome(e.target.value)} />
      </div>

      <div className="row" style={{ gap: 8 }}>
        <input className="inp" style={{ flex: 1 }} value={texto} placeholder="Adicionar item…" onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn" style={{ width: "auto", padding: "0 20px" }} onClick={add}>+</button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {pend.map((it) => (
          <div key={it.id} className="lista-item">
            <button className="lista-check" onClick={() => toggle(it)} aria-label="marcar">○</button>
            <span style={{ flex: 1 }}>{it.texto}</span>
          </div>
        ))}
        {pend.length === 0 && <p className="muted" style={{ textAlign: "center" }}>Tudo marcado! 💛</p>}
      </div>

      {feitos.length > 0 && (
        <div>
          <div className="lista-secao">✓ Já pegos ({feitos.length})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {feitos.map((it) => (
              <div key={it.id} className="lista-item feito">
                <button className="lista-check on" onClick={() => toggle(it)} aria-label="desmarcar">✓</button>
                <span style={{ flex: 1 }}>{it.texto}{it.feito_por ? <span className="opt"> · {it.feito_por}</span> : null}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>Feito com 💛 pela Marta · Damas Virtuosas</p>
    </div>
  );
}
