"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addItem, alternarItem, apagarItem, apagarLista } from "@/app/listas/actions";
import CompartilharWhats from "@/components/CompartilharWhats";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ListaEditor({ lista, familia = null }) {
  const router = useRouter();
  const [itens, setItens] = useState(lista.itens || []);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setLink(window.location.origin + BASE + "/l/" + lista.token);
    // ao voltar pro app, recarrega os itens (pra ver o que o marido marcou)
    const recarregar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const d = await fetch(BASE + "/api/lista/" + lista.token, { cache: "no-store" }).then((r) => r.json());
        if (d?.ok) setItens(d.itens);
      } catch {}
    };
    document.addEventListener("visibilitychange", recarregar);
    return () => document.removeEventListener("visibilitychange", recarregar);
  }, [lista.token]);

  async function add() {
    const t = texto.trim(); if (!t) return;
    const r = await addItem({ listaId: lista.id, texto: t });
    if (r?.ok) { setItens((c) => [...c, { id: r.id, texto: t, feito: false }]); setTexto(""); }
  }
  async function toggle(it) {
    setItens((c) => c.map((x) => (x.id === it.id ? { ...x, feito: !x.feito } : x)));
    await alternarItem({ id: it.id, feito: !it.feito });
  }
  async function apagar(id) { setItens((c) => c.filter((x) => x.id !== id)); await apagarItem(id); }
  async function apagarL() { if (!confirm("Apagar esta lista inteira?")) return; await apagarLista(lista.id); router.push("/listas"); }
  function copiar() { try { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch {} }

  const pend = itens.filter((i) => !i.feito), feitos = itens.filter((i) => i.feito);
  const textoWhats = `📝 *${lista.titulo}* — marque junto comigo aqui 👇\n${link}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row" style={{ gap: 8 }}>
        <input className="inp" style={{ flex: 1 }} value={texto} placeholder="Adicionar item…" autoFocus
          onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn" style={{ width: "auto", padding: "0 20px" }} onClick={add}>+</button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {pend.map((it) => (
          <div key={it.id} className="lista-item">
            <button className="lista-check" onClick={() => toggle(it)} aria-label="marcar">○</button>
            <span style={{ flex: 1 }}>{it.texto}</span>
            <button className="lista-x" onClick={() => apagar(it.id)} aria-label="apagar">✕</button>
          </div>
        ))}
        {pend.length === 0 && <p className="muted" style={{ textAlign: "center" }}>Lista vazia — comece a adicionar. 💛</p>}
      </div>

      {feitos.length > 0 && (
        <div>
          <div className="lista-secao">✓ Já pegos ({feitos.length})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {feitos.map((it) => (
              <div key={it.id} className="lista-item feito">
                <button className="lista-check on" onClick={() => toggle(it)} aria-label="desmarcar">✓</button>
                <span style={{ flex: 1 }}>{it.texto}{it.feito_por ? <span className="opt"> · {it.feito_por}</span> : null}</span>
                <button className="lista-x" onClick={() => apagar(it.id)} aria-label="apagar">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="c-k">🔗 Marque junto com a família</div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Mande o link — o marido/filhos marcam sem instalar nada nem entrar em conta.</p>
        <div className="row" style={{ gap: 8 }}>
          <input className="inp" style={{ flex: 1, fontSize: 12.5 }} value={link} readOnly onFocus={(e) => e.target.select()} />
          <button className="chip" onClick={copiar}>{copiado ? "✓ copiado" : "copiar"}</button>
        </div>
        <CompartilharWhats texto={textoWhats} familia={familia} logado label="Enviar a lista no WhatsApp" />
      </div>

      <button className="btn ghost" onClick={apagarL} style={{ color: "var(--clay)" }}>🗑️ Apagar lista</button>
    </div>
  );
}
