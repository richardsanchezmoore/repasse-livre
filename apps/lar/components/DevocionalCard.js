"use client";
import { useState, useEffect } from "react";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";

/** Devocional compacto: uma linha (título + Ouvir + seta). Expande o texto pra quem
 *  prefere ler à noite em vez de ouvir. Não come a tela inteira. */
export default function DevocionalCard({ dev }) {
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);
  if (!dev?.reflexao) return null;

  function ouvir(e) {
    e?.stopPropagation?.();
    if (falando) { pararFala(); setFalando(false); return; }
    const t = [dev.reflexao, dev.oracao].filter(Boolean).join(" ");
    falar(t, { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  return (
    <div className="devoc">
      <div className="devoc-bar" onClick={() => setAberto((v) => !v)} role="button" aria-expanded={aberto}>
        <span className="devoc-h">✦ Devocional de 1 min{dev.tema ? ` · ${dev.tema}` : ""}</span>
        <div className="devoc-acts">
          {temVoz && (
            <button type="button" className="chip devoc-ouvir" onClick={ouvir}>
              {falando ? "⏹ Parar" : "🔊 Ouvir a Marta"}
            </button>
          )}
          <span className={"devoc-chev" + (aberto ? " up" : "")} aria-hidden="true">⌄</span>
        </div>
      </div>
      {aberto && (
        <div className="devoc-body">
          {dev.referencia && <div className="devoc-ref">{dev.referencia}</div>}
          <p className="devoc-txt">{dev.reflexao}</p>
          {dev.oracao && <p className="devoc-ora">🙏 {dev.oracao}</p>}
        </div>
      )}
    </div>
  );
}
