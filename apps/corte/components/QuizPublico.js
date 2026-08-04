"use client";
import { useState } from "react";
import { QUIZ, faixaDoTotal } from "@/lib/quiz";

/** Funil público: roda o quiz (valor primeiro) e, pra revelar o Veredito, pede
 *  e-mail + WhatsApp (lead). Depois do Veredito, upsell pro Kit. Sem login. */
export default function QuizPublico() {
  const [fase, setFase] = useState("quiz"); // quiz | gate | fim
  const [idx, setIdx] = useState(0);
  const [resp, setResp] = useState([]);
  const [lead, setLead] = useState({ email: "", whatsapp: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const total = resp.reduce((a, b) => a + (b || 0), 0);

  function escolher(p) {
    const novo = [...resp];
    novo[idx] = p;
    setResp(novo);
    if (idx < QUIZ.questoes.length - 1) setIdx(idx + 1);
    else setFase("gate");
  }

  async function revelar(e) {
    e.preventDefault();
    setErro("");
    const email = lead.email.trim().toLowerCase();
    const whats = lead.whatsapp.replace(/[^\d+]/g, "");
    if (!email.includes("@")) { setErro("Confirme o seu melhor e-mail."); return; }
    if (whats.replace(/\D/g, "").length < 10) { setErro("Informe o WhatsApp com DDD."); return; }
    setBusy(true);
    const f = faixaDoTotal(total);
    try {
      await fetch("/api/lead", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, whatsapp: whats, total, faixa: f.cls }),
      });
    } catch { /* não trava a UX */ }
    try { if (window.fbq) window.fbq("track", "Lead", { content_name: "Veredito Real" }); } catch { /* pixel opcional */ }
    setBusy(false);
    setFase("fim");
  }

  // ── VEREDITO (após o gate) ──────────────────────────────────────────────
  if (fase === "fim") {
    const f = faixaDoTotal(total);
    return (
      <main className="screen fx">
        <div className="fx-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className={"qz-verdict qz-" + f.cls}>
            <div className="qz-score">{total} <span>/ {QUIZ.max}</span><small>pontos da temporada</small></div>
            <h2>{f.titulo}</h2>
            <p>{f.texto}</p>
          </div>

          <div className="card" style={{ marginTop: 18, textAlign: "center" }}>
            <div className="c-k">Isto foram só 4 perguntas ✦</div>
            <div className="c-t" style={{ marginBottom: 6 }}>Quer investigar a fundo?</div>
            <p className="c-p" style={{ marginBottom: 14 }}>
              O <b>Kit de Discernimento</b> traz os <b>12 tipos</b> a reconhecer, o <b>Dossiê</b> pra investigar o seu pretendente de verdade e o <b>Veredito completo</b> — no seu celular.
            </p>
            <a href="/panfleto" className="pill" style={{ width: "100%", justifyContent: "center" }}>👑 Conhecer o Kit completo →</a>
          </div>
        </div>
      </main>
    );
  }

  // ── GATE (troca o Veredito por e-mail + WhatsApp) ───────────────────────
  if (fase === "gate") {
    return (
      <main className="screen fx">
        <div className="fx-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="fx-eyebrow">◈ O seu Veredito está pronto ◈</div>
            <h1 className="fx-q" style={{ marginBottom: 6 }}>Para onde envio o <em>seu Veredito</em>?</h1>
            <p className="c-p" style={{ maxWidth: 420, margin: "0 auto 16px" }}>Revele o resultado agora — e receba também dicas de discernimento no seu WhatsApp.</p>
          </div>
          <form onSubmit={revelar} className="card" style={{ display: "grid", gap: 10 }}>
            <input className="fld" type="email" value={lead.email} placeholder="Seu melhor e-mail" autoComplete="email" required
              onChange={(e) => setLead({ ...lead, email: e.target.value })} />
            <input className="fld" type="tel" value={lead.whatsapp} placeholder="WhatsApp (com DDD)" autoComplete="tel" required
              onChange={(e) => setLead({ ...lead, whatsapp: e.target.value })} />
            {erro && <p className="fld-err">{erro}</p>}
            <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Revelando…" : "🔮 Revelar o meu Veredito →"}
            </button>
            <p className="opt" style={{ fontSize: 12 }}>Nada de spam. Você pode sair quando quiser.</p>
          </form>
        </div>
      </main>
    );
  }

  // ── QUIZ ────────────────────────────────────────────────────────────────
  const q = QUIZ.questoes[idx];
  return (
    <main className="screen fx">
      <div className="fx-top">
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
