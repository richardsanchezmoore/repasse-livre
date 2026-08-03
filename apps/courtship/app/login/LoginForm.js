"use client";
import { useState } from "react";
import { entrar } from "./actions";

export default function LoginForm() {
  const [f, setF] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const r = await entrar(f);
      if (r?.erro) setErro(r.erro);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={enviar}>
      <label className="fld-l">Email</label>
      <input className="fld" type="email" value={f.email} onChange={up("email")} placeholder="you@email.com" autoComplete="email" required />
      <label className="fld-l" style={{ marginTop: 12 }}>Password</label>
      <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="current-password" required />
      {erro && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
        {busy ? "Signing in…" : "Log in →"}
      </button>
    </form>
  );
}
