"use client";
import { useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function BemVindaAcesso({ emailInicial }) {
  const [email, setEmail] = useState(emailInicial || "");
  const [estado, setEstado] = useState("idle"); // idle | enviando | enviado
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e?.preventDefault();
    if (!email.includes("@")) { setErro("Confirme o e-mail que você usou na compra."); return; }
    setEstado("enviando"); setErro("");
    const sb = criarSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dossie` },
    });
    if (error) { setErro(error.message); setEstado("idle"); } else setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div>
        <div className="c-t">Acesso enviado ✧</div>
        <p className="c-p">Abra o e-mail <strong>{email}</strong> e toque no link para entrar na Corte. (dê uma olhada no spam, se precisar)</p>
      </div>
    );
  }
  return (
    <form onSubmit={enviar}>
      <label className="fld-l">E-mail da sua compra</label>
      <input className="fld" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required />
      {erro && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={estado === "enviando"} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
        {estado === "enviando" ? "Enviando…" : "Receber meu acesso →"}
      </button>
    </form>
  );
}
