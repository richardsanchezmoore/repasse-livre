"use client";
import { useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";
import { criarConta, entrarComSenha } from "./actions";

export default function EntrarForm() {
  const [modo, setModo] = useState("entrar"); // entrar | criar
  const [f, setF] = useState({ nome: "", email: "", senha: "", confirma: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [magico, setMagico] = useState(null); // null | "enviando" | "enviado"

  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const redirect = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("redirect") || "/dossie") : "/dossie";

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const r = modo === "criar"
        ? await criarConta({ ...f, redirect })
        : await entrarComSenha({ email: f.email, senha: f.senha, redirect });
      if (r?.erro) setErro(r.erro);
    } finally { setBusy(false); }
  }

  async function linkMagico() {
    if (!f.email.includes("@")) { setErro("Digite seu e-mail acima primeiro."); return; }
    setErro(""); setMagico("enviando");
    const sb = criarSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email: f.email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) { setErro(error.message); setMagico(null); } else setMagico("enviado");
  }

  if (magico === "enviado") {
    return (
      <div>
        <div className="c-t">Selo enviado ✧</div>
        <p className="c-p">Confira o e-mail <strong>{f.email}</strong> e toque no link para entrar.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="seg">
        <button type="button" className={modo === "entrar" ? "on" : ""} onClick={() => { setModo("entrar"); setErro(""); }}>Entrar</button>
        <button type="button" className={modo === "criar" ? "on" : ""} onClick={() => { setModo("criar"); setErro(""); }}>Criar conta</button>
      </div>

      <form onSubmit={enviar}>
        {modo === "criar" && (
          <>
            <label className="fld-l">Seu nome</label>
            <input className="fld" value={f.nome} onChange={up("nome")} placeholder="Como quer ser chamada?" autoComplete="name" />
          </>
        )}
        <label className="fld-l" style={{ marginTop: modo === "criar" ? 12 : 0 }}>E-mail</label>
        <input className="fld" type="email" value={f.email} onChange={up("email")} placeholder="voce@email.com" autoComplete="email" required />

        <label className="fld-l" style={{ marginTop: 12 }}>Senha</label>
        <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete={modo === "criar" ? "new-password" : "current-password"} required />

        {modo === "criar" && (
          <>
            <label className="fld-l" style={{ marginTop: 12 }}>Confirmar senha</label>
            <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
          </>
        )}

        {erro && <p className="fld-err">{erro}</p>}

        <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
          {busy ? "Um instante…" : modo === "criar" ? "Criar minha conta →" : "Entrar →"}
        </button>
      </form>

      <button type="button" className="link-sutil" onClick={linkMagico} disabled={magico === "enviando"}>
        {magico === "enviando" ? "Enviando…" : "Prefiro entrar por link mágico"}
      </button>
    </div>
  );
}
