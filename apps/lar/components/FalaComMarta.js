"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";
import { sttServidorDisponivel, webSpeechDisponivel, iniciarGravacao, transcrever, ouvirWebSpeech } from "@/lib/ouvir";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const HREF = { cozinha: "/cozinha", casa: "/casa", filhos: "/filhos", financas: "/financas", jogos: "/jogos", agenda: "/agenda", listas: "/listas" };
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
  const [modoVoz, setModoVoz] = useState(null); // 'server' | 'webspeech' | null
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const gravRef = useRef(null);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (await sttServidorDisponivel()) { if (vivo) setModoVoz("server"); return; }
      if (webSpeechDisponivel()) { if (vivo) setModoVoz("webspeech"); }
    })();
    return () => { vivo = false; };
  }, []);

  // Microfone: 'webspeech' escuta ao vivo; 'server' grava e manda pro Whisper.
  async function toggleMic() {
    if (busy || transcrevendo) return;
    setErro("");
    if (modoVoz === "webspeech") {
      if (gravando) { try { gravRef.current?.stop?.(); } catch {} setGravando(false); return; }
      pararFala();
      const rec = ouvirWebSpeech({
        onTexto: (txt) => { if (txt) perguntar(txt); },
        onFim: () => setGravando(false),
        onErro: () => { setGravando(false); setErro("Não consegui te ouvir. Tente de novo."); },
      });
      if (rec) { gravRef.current = rec; setGravando(true); }
      return;
    }
    // modo server (Whisper)
    if (!gravando) {
      try { gravRef.current = await iniciarGravacao(); setGravando(true); pararFala(); }
      catch { setErro("Preciso da sua permissão pro microfone."); }
      return;
    }
    setGravando(false); setTranscrevendo(true);
    try {
      const blob = await gravRef.current.parar();
      const d = await transcrever(blob);
      if (d?.ok && d.texto) perguntar(d.texto);
      else setErro("Não consegui entender o áudio. Tente de novo.");
    } catch { setErro("Não consegui gravar agora."); }
    finally { setTranscrevendo(false); }
  }

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
          placeholder={gravando ? "Estou te ouvindo…" : transcrevendo ? "Entendendo o que você disse…" : "Pergunte à Marta…"} />
        {modoVoz && (
          <button type="button" className={"fala-mic" + (gravando ? " rec" : "")} onClick={toggleMic}
            disabled={busy || transcrevendo} aria-label={gravando ? "parar de ouvir" : "falar com a Marta"}
            title={gravando ? "Toque pra parar" : "Falar em vez de digitar"}>
            {transcrevendo ? <span className="spin" style={{ width: 18, height: 18, borderWidth: 2 }} /> : gravando ? "■" : "🎤"}
          </button>
        )}
        <button className="fala-send" onClick={() => perguntar()} disabled={busy} aria-label="perguntar">
          {busy ? <span className="spin" style={{ width: 18, height: 18, borderWidth: 2 }} /> : "➤"}
        </button>
      </div>
      {gravando && <p className="opt" style={{ margin: "8px 2px 0", color: "var(--clay)" }}>🔴 Ouvindo… toque no ■ pra eu responder.</p>}

      {thread.length === 0 && !busy && (
        <div className="chips" style={{ marginTop: 10 }}>
          {SUGESTOES.map((s) => <button key={s} className="chip" onClick={() => perguntar(s)}>{s}</button>)}
        </div>
      )}
      {erro && <p className="erro" style={{ marginTop: 10 }}>{erro}</p>}
    </div>
  );
}
