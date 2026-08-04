"use client";
import { useState, useEffect, useRef } from "react";
import { faixaDoTotal } from "@/lib/quiz";

/** Funil público: roda o quiz (do banco) e, pra revelar o Veredito, pede
 *  e-mail + WhatsApp (lead). Depois do Veredito, upsell pro Kit. Sem login. */
export default function QuizPublico({ quiz, comunidadeUrl, mostrarComunidade }) {
  const QUESTOES = quiz?.questoes || [];
  const MAX = quiz?.max || QUESTOES.reduce((a, q) => a + Math.max(...(q.opcoes || []).map((o) => o.p || 0), 0), 0);
  const FAIXAS = quiz?.faixas || [];
  const SLUG = quiz?.slug || null;
  // Botão da comunidade no Veredito: só aparece se ligado no painel. Desligado = foco
  // total na landing (Kit); o WhatsApp já foi captado e a entrada no grupo é manual.
  const COMUNIDADE = mostrarComunidade ? (comunidadeUrl || "") : "";

  const [fase, setFase] = useState("quiz"); // quiz | gate | fim
  const [idx, setIdx] = useState(0);
  const [resp, setResp] = useState([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const total = resp.reduce((a, b) => a + (b || 0), 0);

  // ── funil interno (visita + quiz_fim), com id anônimo p/ contar distintos ──
  const vidRef = useRef(null);
  const fimRef = useRef(false);
  function getVid() {
    if (vidRef.current) return vidRef.current;
    try {
      let v = localStorage.getItem("dv_vid");
      if (!v) { v = (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2)); localStorage.setItem("dv_vid", v); }
      vidRef.current = v; return v;
    } catch { return null; }
  }
  function logEvento(tipo) {
    try {
      fetch("/api/evento", {
        method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
        body: JSON.stringify({ tipo, vid: getVid(), quiz_slug: SLUG }),
      });
    } catch { /* best-effort */ }
  }
  useEffect(() => { logEvento("visita"); /* uma vez por carregamento */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function escolher(p) {
    const novo = [...resp];
    novo[idx] = p;
    setResp(novo);
    if (idx < QUESTOES.length - 1) setIdx(idx + 1);
    else {
      setFase("gate");
      if (!fimRef.current) {
        fimRef.current = true;
        logEvento("quiz_fim");
        try { if (window.fbq) window.fbq("trackCustom", "QuizCompleto", { content_name: quiz?.titulo || "Veredito" }); } catch { /* pixel opcional */ }
      }
    }
  }

  async function revelar(e) {
    e.preventDefault();
    setErro("");
    const whats = whatsapp.replace(/[^\d+]/g, "");
    if (whats.replace(/\D/g, "").length < 10) { setErro("Informe o WhatsApp com DDD."); return; }
    setBusy(true);
    const f = faixaDoTotal(total, FAIXAS);
    try {
      await fetch("/api/lead", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ whatsapp: whats, total, faixa: f?.cls, quiz_slug: SLUG }),
      });
    } catch { /* não trava a UX */ }
    try { if (window.fbq) window.fbq("track", "Lead", { content_name: quiz?.titulo || "Veredito" }); } catch { /* pixel opcional */ }
    setBusy(false);
    setFase("fim");
  }

  if (!QUESTOES.length) {
    return <main className="screen"><p className="muted" style={{ marginTop: 40 }}>Quiz indisponível no momento.</p></main>;
  }

  // ── VEREDITO ──────────────────────────────────────────────────────────────
  if (fase === "fim") {
    const f = faixaDoTotal(total, FAIXAS);
    return (
      <main className="screen fx">
        <div className="fx-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className={"qz-verdict qz-" + (f?.cls || "amber")}>
            <div className="qz-score">{total} <span>/ {MAX}</span><small>pontos da temporada</small></div>
            <h2>{f?.titulo}</h2>
            <p>{f?.texto}</p>
          </div>
          {COMUNIDADE && (
            <a href={COMUNIDADE} target="_blank" rel="noreferrer" className="pill"
              style={{ width: "100%", justifyContent: "center", marginTop: 16, background: "linear-gradient(180deg,#1f8a5b,#136b43)", borderColor: "#37b481" }}>
              💬 Entrar na comunidade das Damas →
            </a>
          )}
          <div className="card" style={{ marginTop: 18, textAlign: "center" }}>
            <div className="c-k">Isto foram só {QUESTOES.length} perguntas ✦</div>
            <div className="c-t" style={{ marginBottom: 6 }}>Quer investigar a fundo?</div>
            <p className="c-p" style={{ marginBottom: 14 }}>
              O <b>Kit de Discernimento</b> traz os <b>12 tipos</b> a reconhecer, o <b>Dossiê</b> pra investigar o seu pretendente de verdade e o <b>Veredito completo</b> — no seu celular.
            </p>
            <a href="/panfleto" className="pill" style={{ width: "100%", justifyContent: "center" }}>👑 Acessar o Kit completo →</a>
          </div>
        </div>
      </main>
    );
  }

  // ── GATE ──────────────────────────────────────────────────────────────────
  if (fase === "gate") {
    return (
      <main className="screen fx">
        <div className="fx-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="fx-eyebrow">◈ O seu Veredito está pronto ◈</div>
            <h1 className="fx-q" style={{ marginBottom: 6 }}>Revele o <em>resultado</em> agora</h1>
            <p className="c-p" style={{ maxWidth: 430, margin: "0 auto 16px" }}>E ainda receba <b>GRATUITAMENTE</b> o Guia “Verde ou Vermelho?” além do acesso à nossa comunidade de discernimento.</p>
          </div>
          <form onSubmit={revelar} className="card" style={{ display: "grid", gap: 10 }}>
            <input className="fld" type="tel" value={whatsapp} placeholder="WhatsApp (com DDD)" autoComplete="tel" inputMode="tel" required
              onChange={(e) => setWhatsapp(e.target.value)} />
            {erro && <p className="fld-err">{erro}</p>}
            <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Revelando…" : "🔮 Revelar o meu Veredito →"}
            </button>
            <p className="opt" style={{ fontSize: 12 }}>É rápido e sem spam — só o essencial pra você entrar na comunidade.</p>
          </form>
        </div>
      </main>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  const q = QUESTOES[idx];
  return (
    <main className="screen fx">
      <div className="fx-top">
        <div className="fx-prog" style={{ marginTop: 10 }}>
          {QUESTOES.map((_, i) => (
            <div key={i} className={"fx-seg" + (i === idx ? " atual" : "")}>
              <span style={{ width: i < idx ? "100%" : i === idx ? "45%" : "0%" }} />
            </div>
          ))}
        </div>
        <div className="fx-eyebrow">◈ O Veredito Real · {q.n || `Pergunta ${idx + 1}`} ◈</div>
        <h1 className="fx-q">{q.t}</h1>
      </div>
      <div className="fx-scroll">
        <div className="qopts">
          {(q.opcoes || []).map((o, i) => (
            <button type="button" key={idx + "-" + i} className="qopt" onClick={(e) => { e.currentTarget.blur(); escolher(o.p); }}>{o.t}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
