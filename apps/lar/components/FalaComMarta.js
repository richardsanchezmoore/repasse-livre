"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const HREF = { cozinha: "/cozinha", casa: "/casa", filhos: "/filhos", financas: "/financas" };
const SUGESTOES = [
  "Tenho frango e batata, o que faço pro jantar?",
  "A casa tá um caos, por onde começo?",
  "Meu filho não quer largar a tela",
];

export default function FalaComMarta({ historicoInicial = [] }) {
  const [thread, setThread] = useState(() =>
    (Array.isArray(historicoInicial) ? historicoInicial : []).map((m) => ({ papel: m.papel, texto: m.texto }))
  );
  const [pergunta, setPergunta] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [falandoIdx, setFalandoIdx] = useState(-1);
  const [temVoz, setTemVoz] = useState(false);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  async function perguntar(texto) {
    const q = (texto ?? pergunta).trim();
    if (!q || busy) return;
    setErro(""); setPergunta(""); pararFala(); setFalandoIdx(-1);
    setThread((t) => [...t, { papel: "user", texto: q }]);
    setBusy(true);
    try {
      const r = await fetch(BASE + "/api/marta/fala", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: q }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui responder agora."); return; }
      setThread((t) => [...t, { papel: "marta", texto: d.resposta, modulo: d.modulo, acao: d.acao }]);
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  function ouvir(idx, texto) {
    if (falandoIdx === idx) { pararFala(); setFalandoIdx(-1); return; }
    pararFala(); setFalandoIdx(idx);
    falar(texto, { onFim: () => setFalandoIdx(-1) });
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>💬 Fale comigo</div>

      {thread.length > 0 && (
        <div className="thread">
          {thread.map((m, i) => m.papel === "user" ? (
            <div key={i} className="bubble-u">{m.texto}</div>
          ) : (
            <div key={i} className="marta-hi" style={{ marginBottom: 0 }}>
              <div className="av">M</div>
              <div className="msg">
                {m.texto}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {temVoz && <button className="chip" onClick={() => ouvir(i, m.texto)}>{falandoIdx === i ? "⏹ Parar" : "🔊 Ouvir"}</button>}
                  {m.modulo && HREF[m.modulo] && <Link href={HREF[m.modulo]} className="chip on">{m.acao || "Abrir"} →</Link>}
                </div>
              </div>
            </div>
          ))}
          {busy && <div className="loading" style={{ padding: 10 }}><div className="spin" /></div>}
        </div>
      )}

      <div className="fala-in">
        <input className="inp" value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") perguntar(); }}
          placeholder="Pergunte à Marta…" />
        <button className="fala-send" onClick={() => perguntar()} disabled={busy} aria-label="perguntar">
          {busy ? <span className="spin" style={{ width: 18, height: 18, borderWidth: 2 }} /> : "➤"}
        </button>
      </div>

      {thread.length === 0 && !busy && (
        <div className="chips" style={{ marginTop: 10 }}>
          {SUGESTOES.map((s) => <button key={s} className="chip" onClick={() => perguntar(s)}>{s}</button>)}
        </div>
      )}
      {erro && <p className="erro" style={{ marginTop: 10 }}>{erro}</p>}
    </div>
  );
}
