"use client";
import { useEffect, useRef, useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";
import { definirAcessoBoasVindas } from "@/app/welcome/actions";

/** Exchanges the claim credentials for a session (verifyOtp variants across versions). */
async function criarSessao(sb, { email, hashedToken, emailOtp }) {
  const tentativas = [];
  if (hashedToken) tentativas.push(() => sb.auth.verifyOtp({ token_hash: hashedToken, type: "email" }));
  if (emailOtp) {
    tentativas.push(() => sb.auth.verifyOtp({ email, token: emailOtp, type: "magiclink" }));
    tentativas.push(() => sb.auth.verifyOtp({ email, token: emailOtp, type: "email" }));
  }
  for (const tentar of tentativas) {
    try { const { error } = await tentar(); if (!error) return true; } catch { /* next */ }
  }
  return false;
}

export default function WelcomeAccess({ emailInicial }) {
  // phase: verifying (claim auto-login) · password (logged in, just set a password) · form (email+password fallback)
  const [fase, setFase] = useState("form");
  const [f, setF] = useState({ email: emailInicial || "", senha: "", confirma: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [jaTem, setJaTem] = useState(false);
  const rodou = useRef(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;
    // Claim token: ?claim=... in the URL OR localStorage 'ca_claim' (set on the landing).
    let token = null;
    try {
      const q = new URLSearchParams(window.location.search);
      token = q.get("claim") || localStorage.getItem("ca_claim");
    } catch { /* no storage */ }
    if (!token) return; // no token → stays on the fallback form

    setFase("verificando");
    (async () => {
      const sb = criarSupabaseBrowser();
      // The buyer may arrive before the webhook writes the claim → poll in the background.
      for (let i = 0; i < 60; i++) {
        let r;
        try {
          const resp = await fetch("/api/claim", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          });
          r = await resp.json();
        } catch { break; }
        if (r.pronto && r.email) {
          const ok = await criarSessao(sb, { email: r.email, hashedToken: r.hashedToken, emailOtp: r.emailOtp });
          try { localStorage.removeItem("ca_claim"); } catch {}
          setFase(ok ? "senha" : "form");
          return;
        }
        if (!r.aguardando) break; // expired/consumed → fallback
        await new Promise((res) => setTimeout(res, 4000)); // wait for the webhook
      }
      setFase("form");
    })();
  }, []);

  // Phase "password": already logged in via claim, just set a password and go.
  async function salvarSenha(e) {
    e.preventDefault();
    setErro("");
    if (f.senha.length < 6) { setErro("Use at least 6 characters."); return; }
    if (f.senha !== f.confirma) { setErro("The passwords don't match."); return; }
    setBusy(true);
    const sb = criarSupabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: f.senha });
    setBusy(false);
    if (error) { setErro("Couldn't save the password just now. Please try again."); return; }
    window.location.href = "/";
  }

  // Phase "form": fallback (paid on another device / storage cleared) → email + password.
  async function enviar(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const r = await definirAcessoBoasVindas(f);
      if (r?.jaConfigurada) setJaTem(true);
      else if (r?.erro) setErro(r.erro);
    } finally { setBusy(false); }
  }

  if (jaTem) {
    return (
      <div>
        <div className="c-t">This account already has a password ✧</div>
        <p className="c-p">Just log in with your email and the password you created.</p>
        <a href="/login" className="pill" style={{ marginTop: 12 }}>Go to login →</a>
      </div>
    );
  }

  if (fase === "verificando") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="c-t">Confirming your access…</div>
        <p className="c-p">Keep this page open — the moment your payment clears, you're in automatically. ✧</p>
        <div className="bv-spin" aria-hidden />
      </div>
    );
  }

  if (fase === "senha") {
    return (
      <form onSubmit={salvarSenha}>
        <div className="c-t" style={{ marginBottom: 4 }}>Access granted! 👑</div>
        <p className="c-p" style={{ marginBottom: 10 }}>Create a password to log in whenever you like — that's it.</p>
        <label className="fld-l">Create a password</label>
        <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="new-password" required autoFocus />
        <label className="fld-l" style={{ marginTop: 12 }}>Confirm password</label>
        <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
        {erro && <p className="fld-err">{erro}</p>}
        <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
          {busy ? "Signing in…" : "Set password and enter →"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={enviar}>
      <label className="fld-l">The email from your purchase</label>
      <input className="fld" type="email" value={f.email} onChange={up("email")} placeholder="you@email.com" autoComplete="email" required />
      <label className="fld-l" style={{ marginTop: 12 }}>Create a password</label>
      <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="new-password" required />
      <label className="fld-l" style={{ marginTop: 12 }}>Confirm password</label>
      <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
      {erro && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
        {busy ? "Signing in…" : "Set password and enter →"}
      </button>
    </form>
  );
}
