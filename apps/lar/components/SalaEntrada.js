"use client";
import { useState } from "react";
import { garantirPerfil } from "@/app/sala/actions";

const AVATARES = ["🌷", "🌻", "🌸", "🕊️", "💛", "🍒", "🌿", "☕", "📖", "🪴"];
const REGRAS = [
  "Aqui a gente se acolhe — nada de julgar ou humilhar.",
  "O que é desabafo fica na Sala. Sigilo entre irmãs. 🤫",
  "Sem vender, sem links, sem telefone/CPF (te protege de golpe).",
  "Viu algo que fere? Denuncie — a gente cuida.",
];

export default function SalaEntrada() {
  const [apelido, setApelido] = useState("");
  const [avatar, setAvatar] = useState("🌷");
  const [aceito, setAceito] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    if (!aceito) { setErro("Aceite as combinações da Sala pra entrar. 💛"); return; }
    setBusy(true);
    const r = await garantirPerfil({ apelido, avatar });
    setBusy(false);
    if (r?.erro) { setErro(r.erro); return; }
    location.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="marta-hi">
        <div className="av">M</div>
        <div className="msg">Bem-vinda à <b>Sala</b> 💛 — o cantinho das nossas conversas de mãe e esposa. Antes de entrar, escolhe como quer aparecer e combina comigo o essencial.</div>
      </div>

      <div className="card">
        <div className="field">
          <label>Seu apelido na Sala</label>
          <input className="inp" value={apelido} maxLength={24} placeholder="Ex.: Dona Rosa, Mãe do Théo…"
            onChange={(e) => setApelido(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Seu avatar</label>
          <div className="chips">
            {AVATARES.map((a) => (
              <button key={a} type="button" className={"chip" + (avatar === a ? " on" : "")} style={{ fontSize: 18 }} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>As combinações da Sala</div>
        <ul style={{ listStyle: "none", display: "grid", gap: 8, margin: 0, padding: 0 }}>
          {REGRAS.map((r, i) => <li key={i} style={{ fontSize: 14.5, lineHeight: 1.5 }}>✓ {r}</li>)}
        </ul>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
          <span style={{ fontSize: 14.5 }}>Eu combino e vou cuidar dessa Sala com carinho.</span>
        </label>
      </div>

      {erro && <p className="erro">{erro}</p>}
      <button className="btn" onClick={entrar} disabled={busy}>{busy ? "Entrando…" : "💬 Entrar na Sala"}</button>
    </div>
  );
}
