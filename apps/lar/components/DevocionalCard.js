"use client";
import { useState, useEffect } from "react";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";

export default function DevocionalCard({ dev }) {
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);
  if (!dev?.reflexao) return null;

  function ouvir() {
    if (falando) { pararFala(); setFalando(false); return; }
    const t = [dev.reflexao, dev.oracao].filter(Boolean).join(" ");
    falar(t, { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  return (
    <div className="devoc">
      <div className="devoc-h">✦ Devocional de 1 minuto{dev.tema ? ` · ${dev.tema}` : ""}</div>
      {dev.referencia && <div className="devoc-ref">{dev.referencia}</div>}
      <p className="devoc-txt">{dev.reflexao}</p>
      {dev.oracao && <p className="devoc-ora">🙏 {dev.oracao}</p>}
      {temVoz && (
        <button className="chip" onClick={ouvir} style={{ marginTop: 10 }}>
          {falando ? "⏹ Parar" : "🔊 Ouvir a Marta"}
        </button>
      )}
    </div>
  );
}
