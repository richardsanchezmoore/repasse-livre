"use client";
import { useState } from "react";
import Link from "next/link";
import { QUIZ, faixaDoTotal } from "@/lib/quiz";

export default function Quiz() {
  const [idx, setIdx] = useState(0);
  const [resp, setResp] = useState([]);
  const [fim, setFim] = useState(false);

  function escolher(p) {
    const novo = [...resp];
    novo[idx] = p;
    setResp(novo);
    if (idx < QUIZ.questoes.length - 1) setIdx(idx + 1);
    else setFim(true);
  }
  function refazer() { setResp([]); setIdx(0); setFim(false); }

  if (fim) {
    const total = resp.reduce((a, b) => a + (b || 0), 0);
    const f = faixaDoTotal(total);
    return (
      <main className="screen fx">
        <div className="fx-top"><Link href="/" className="fx-x" aria-label="fechar">✕</Link></div>
        <div className="fx-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className={"qz-verdict qz-" + f.cls}>
            <div className="qz-score">{total} <span>/ {QUIZ.max}</span><small>pontos da temporada</small></div>
            <h2>{f.titulo}</h2>
            <p>{f.texto}</p>
          </div>
          <button type="button" className="fx-skip" onClick={refazer} style={{ margin: "18px auto 4px" }}>↺ Refazer o teste</button>
          <p className="muted" style={{ fontFamily: "var(--script)", fontSize: 26, color: "var(--wine)" }}>Lady Whistledown do Altar</p>
        </div>
      </main>
    );
  }

  const q = QUIZ.questoes[idx];
  return (
    <main className="screen fx">
      <div className="fx-top">
        <Link href="/" className="fx-x" aria-label="fechar">✕</Link>
        <div className="fx-prog" style={{ marginTop: 10 }}>
          {QUIZ.questoes.map((_, i) => (
            <div key={i} className={"fx-seg" + (i === idx ? " atual" : "")}>
              <span style={{ width: i < idx ? "100%" : i === idx ? "45%" : "0%" }} />
            </div>
          ))}
        </div>
        <div className="fx-eyebrow">◈ O Veredito Real · {q.n} ◈</div>
        <h1 className="fx-q">{q.t}</h1>
      </div>
      <div className="fx-scroll">
        <div className="fx-opts">
          {q.opcoes.map((o, i) => (
            <button type="button" key={i} className="fx-opt" onClick={() => escolher(o.p)}>{o.t}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
