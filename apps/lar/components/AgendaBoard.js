"use client";
import { useState } from "react";
import { salvarEvento, apagarEvento } from "@/app/agenda/actions";
import CompartilharWhats from "@/components/CompartilharWhats";

const PRESETS = ["🩺 Consulta médica", "🏫 Reunião na escola", "🎂 Aniversário", "⛪ Culto / Igreja", "💼 Trabalho", "💳 Conta a pagar", "🎉 Evento"];

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hojeISO() { return isoDe(new Date()); }
function amanhaISO() { const d = new Date(); d.setDate(d.getDate() + 1); return isoDe(d); }
function rotuloDia(iso) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - hoje) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function AgendaBoard({ membros = [], eventosIniciais = [], logado = false, familia = null }) {
  const [eventos, setEventos] = useState(eventosIniciais);
  const [abrir, setAbrir] = useState(eventosIniciais.length === 0);
  const [titulo, setTitulo] = useState("");
  const [quem, setQuem] = useState(membros[0] || null);
  const [data, setData] = useState(hojeISO());
  const [hora, setHora] = useState("");
  const [semanal, setSemanal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  function ordenar(lista) {
    return [...lista].sort((a, b) => (a.data + (a.hora || "99")).localeCompare(b.data + (b.hora || "99")));
  }

  async function salvar() {
    setErro("");
    const t = titulo.trim();
    if (!t) { setErro("Dê um nome ao compromisso. 💛"); return; }
    setBusy(true);
    const r = await salvarEvento({ titulo: t, quem: quem?.nome, cor: quem?.cor, data, hora, repete: semanal ? "semanal" : "nao" });
    setBusy(false);
    if (r?.erro) { setErro(r.erro); return; }
    setEventos((cur) => ordenar([...cur, { id: r.id, titulo: t, quem: quem?.nome, cor: quem?.cor, data, hora: hora || null, repete: semanal ? "semanal" : "nao" }]));
    setTitulo(""); setHora(""); setSemanal(false); setAbrir(false);
  }

  async function apagar(id) {
    setEventos((cur) => cur.filter((e) => e.id !== id));
    await apagarEvento(id);
  }

  // agrupa por dia
  const porDia = {};
  for (const e of eventos) (porDia[e.data] = porDia[e.data] || []).push(e);
  const dias = Object.keys(porDia).sort();

  const textoWhats = eventos.length
    ? ["📅 *Agenda da nossa casa*", ...dias.flatMap((dia) => ["", `*${rotuloDia(dia)}*`, ...porDia[dia].map((e) => `• ${e.hora ? e.hora + " " : ""}${e.titulo}${e.quem ? ` — ${e.quem}` : ""}`)])].join("\n")
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!abrir && <button className="btn" onClick={() => setAbrir(true)}>＋ Novo compromisso</button>}

      {abrir && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>O que é?</label>
            <div className="chips" style={{ marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button key={p} type="button" className={"chip" + (titulo === p ? " on" : "")} onClick={() => setTitulo(p)}>{p}</button>
              ))}
            </div>
            <input className="inp" value={titulo} placeholder="Ou escreva…" onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>De quem?</label>
            <div className="chips">
              {membros.map((m) => (
                <button key={m.chave} type="button" className={"chip" + (quem?.chave === m.chave ? " on" : "")}
                  onClick={() => setQuem(m)} style={quem?.chave === m.chave ? { background: m.cor, borderColor: m.cor, color: "#fff" } : { borderColor: m.cor }}>
                  {m.avatar} {m.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Quando?</label>
            <div className="chips" style={{ marginBottom: 8 }}>
              <button type="button" className={"chip" + (data === hojeISO() ? " on" : "")} onClick={() => setData(hojeISO())}>Hoje</button>
              <button type="button" className={"chip" + (data === amanhaISO() ? " on" : "")} onClick={() => setData(amanhaISO())}>Amanhã</button>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <input className="inp" type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ flex: 2 }} />
              <input className="inp" type="time" value={hora} onChange={(e) => setHora(e.target.value)} placeholder="hora" style={{ flex: 1 }} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, cursor: "pointer" }}>
            <input type="checkbox" checked={semanal} onChange={(e) => setSemanal(e.target.checked)} style={{ width: 18, height: 18 }} />
            🔁 Toda semana
          </label>

          {erro && <p className="erro">{erro}</p>}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={salvar} disabled={busy} style={{ flex: 2 }}>{busy ? "Salvando…" : "💾 Guardar na agenda"}</button>
            {eventos.length > 0 && <button className="btn ghost" onClick={() => setAbrir(false)} style={{ flex: 1 }}>Fechar</button>}
          </div>
        </div>
      )}

      {eventos.length === 0 && !abrir && <p className="muted" style={{ textAlign: "center" }}>Sua agenda está livre. Que tal guardar o próximo compromisso? 💛</p>}

      {dias.map((dia) => (
        <div key={dia}>
          <div className="agenda-dia">{rotuloDia(dia)}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {porDia[dia].map((e) => (
              <div key={e.id + e.data} className="agenda-item" style={{ borderLeftColor: e.cor || "var(--clay)" }}>
                <div className="agenda-hora">{e.hora ? e.hora.slice(0, 5) : "dia"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="agenda-tit">{e.titulo}{e.repete === "semanal" ? " 🔁" : ""}</div>
                  {e.quem && <div className="agenda-quem" style={{ color: e.cor || "var(--ink-soft)" }}>{e.quem}</div>}
                </div>
                {!e._repetido && <button className="agenda-x" onClick={() => apagar(e.id)} aria-label="apagar">✕</button>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {textoWhats && <CompartilharWhats texto={textoWhats} familia={familia} logado={logado} label="Enviar a agenda no WhatsApp" />}
    </div>
  );
}
