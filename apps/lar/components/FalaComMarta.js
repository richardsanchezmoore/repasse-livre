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

export default function FalaComMarta() {
  const [pergunta, setPergunta] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null); // { resposta, modulo, acao }
  const [erro, setErro] = useState("");
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  async function perguntar(texto) {
    const q = (texto ?? pergunta).trim();
    if (!q || busy) return;
    setErro(""); setBusy(true); setRes(null); pararFala(); setFalando(false);
    try {
      const r = await fetch(BASE + "/api/marta/fala", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: q }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui responder agora."); return; }
      setRes(d);
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  function ouvir() {
    if (falando) { pararFala(); setFalando(false); return; }
    if (res?.resposta) falar(res.resposta, { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>💬 Fale comigo</div>
      <div className="fala-in">
        <input className="inp" value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") perguntar(); }}
          placeholder="Pergunte à Marta… (ex.: o que faço pro jantar?)" />
        <button className="fala-send" onClick={() => perguntar()} disabled={busy} aria-label="perguntar">
          {busy ? <span className="spin" style={{ width: 18, height: 18, borderWidth: 2 }} /> : "➤"}
        </button>
      </div>

      {!res && !busy && (
        <div className="chips" style={{ marginTop: 10 }}>
          {SUGESTOES.map((s) => (
            <button key={s} className="chip" onClick={() => { setPergunta(s); perguntar(s); }}>{s}</button>
          ))}
        </div>
      )}

      {erro && <p className="erro" style={{ marginTop: 10 }}>{erro}</p>}

      {res && (
        <div className="marta-hi" style={{ marginTop: 12 }}>
          <div className="av">M</div>
          <div className="msg">
            {res.resposta}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {temVoz && <button className="chip" onClick={ouvir}>{falando ? "⏹ Parar" : "🔊 Ouvir"}</button>}
              {res.modulo && <Link href={HREF[res.modulo]} className="chip on">{res.acao || "Abrir"} →</Link>}
              <button className="chip" onClick={() => { setRes(null); setPergunta(""); }}>Perguntar outra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
