"use client";
import { useState } from "react";
import { removerMensagem, dispensarDenuncias, banirAutora, desbanirAutora } from "@/app/admin/sala/actions";

export default function PainelModeracao({ itens }) {
  const [lista, setLista] = useState(itens || []);
  const [busy, setBusy] = useState("");

  async function agir(id, fn, tirarDaLista = true) {
    setBusy(id);
    try { await fn(); if (tirarDaLista) setLista((l) => l.filter((x) => x.id !== id)); }
    finally { setBusy(""); }
  }

  if (!lista.length) {
    return <div className="card" style={{ textAlign: "center", marginTop: 16 }}><p className="muted">Tudo tranquilo por aqui — nenhuma denúncia pendente. 🕊️</p></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
      {lista.map((m) => (
        <div key={m.id} className="card" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="tag" style={{ background: "var(--clay)", color: "#fff" }}>⚠️ {m.denuncias}</span>
            <span className="opt" style={{ fontSize: 12 }}>{m.roda}</span>
            {m.status === "oculto" && <span className="tag">oculta</span>}
            {m.status === "removido" && <span className="tag">removida</span>}
            {m.banida && <span className="tag" style={{ background: "#7c2b37", color: "#fff" }}>autora suspensa</span>}
            <span className="opt" style={{ fontSize: 12, marginLeft: "auto" }}>🕐 {m.quando}</span>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>{m.texto}</div>
          <div className="opt" style={{ fontSize: 12.5 }}>por <b>{m.autor}</b></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <button className="chip" disabled={busy === m.id} onClick={() => agir(m.id, () => dispensarDenuncias(m.id))}>✅ Manter</button>
            <button className="chip on" disabled={busy === m.id} onClick={() => { if (confirm("Remover esta mensagem?")) agir(m.id, () => removerMensagem(m.id)); }} style={{ background: "var(--clay)" }}>🗑️ Remover</button>
            {m.banida
              ? <button className="chip" disabled={busy === m.id} onClick={() => agir(m.id, () => desbanirAutora(m.userId), false)}>↩︎ Reativar autora</button>
              : <button className="chip" disabled={busy === m.id} onClick={() => { if (confirm("Suspender a autora? Ela não poderá mais postar.")) agir(m.id, () => banirAutora(m.userId), false); }}>🚫 Suspender autora</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
