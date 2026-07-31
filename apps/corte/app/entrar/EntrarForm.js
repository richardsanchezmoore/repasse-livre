"use client";
import { useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function EntrarForm() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("idle"); // idle | enviando | enviado | erro
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setEstado("enviando");
    setErro("");
    const sb = criarSupabaseBrowser();
    const redirect = new URLSearchParams(window.location.search).get("redirect") || "/dossie";
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) {
      setErro(error.message);
      setEstado("erro");
    } else {
      setEstado("enviado");
    }
  }

  if (estado === "enviado") {
    return (
      <div>
        <div className="c-t">Selo enviado ✧</div>
        <p className="c-p">Confira o e-mail <strong>{email}</strong> e toque no link para entrar. Pode olhar o spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar}>
      <label className="fld-l">Seu melhor e-mail</label>
      <input
        className="fld"
        type="email"
        required
        placeholder="voce@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      {estado === "erro" && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={estado === "enviando"} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
        {estado === "enviando" ? "Enviando…" : "Receber meu selo mágico →"}
      </button>
    </form>
  );
}
