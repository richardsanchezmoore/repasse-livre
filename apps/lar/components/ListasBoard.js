"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarLista } from "@/app/listas/actions";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const ICONE = { compras: "🛒", tarefas: "✅" };

export default function ListasBoard({ listas = [] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("compras");
  const [busy, setBusy] = useState(false);

  async function criar() {
    if (busy) return;
    setBusy(true);
    const r = await criarLista({ titulo: titulo.trim() || (tipo === "tarefas" ? "Tarefas da casa" : "Lista de compras"), tipo });
    setBusy(false);
    if (r?.ok) router.push("/listas/" + r.id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="c-k">＋ Nova lista</div>
        <div className="tabs">
          <button className={tipo === "compras" ? "on" : ""} onClick={() => setTipo("compras")}>🛒 Compras</button>
          <button className={tipo === "tarefas" ? "on" : ""} onClick={() => setTipo("tarefas")}>✅ Tarefas</button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="inp" style={{ flex: 1 }} value={titulo} placeholder={tipo === "tarefas" ? "Ex.: Faxina do sábado" : "Ex.: Feira da semana"}
            onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") criar(); }} />
          <button className="btn" style={{ width: "auto", padding: "0 18px" }} onClick={criar} disabled={busy}>Criar</button>
        </div>
      </div>

      {listas.map((l) => (
        <Link key={l.id} href={`/listas/${l.id}`} className="mod on" style={{ textDecoration: "none" }}>
          <div className="ic">{ICONE[l.tipo] || "📝"}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="t">{l.titulo}</div>
            <div className="d">{l.pendentes > 0 ? `${l.pendentes} ${l.pendentes === 1 ? "item pendente" : "itens pendentes"}` : "tudo marcado 💛"}</div>
          </div>
          <span className="hoje-go">›</span>
        </Link>
      ))}
      {listas.length === 0 && <p className="muted" style={{ textAlign: "center" }}>Crie a primeira lista — e o marido marca junto pelo link. 💛</p>}
    </div>
  );
}
