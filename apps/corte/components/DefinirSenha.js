"use client";
import { useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function DefinirSenha() {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [estado, setEstado] = useState(""); // "" | ok | erro
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function salvar() {
    if (senha.length < 6) { setEstado("erro"); setMsg("A senha precisa de ao menos 6 caracteres."); return; }
    if (senha !== confirma) { setEstado("erro"); setMsg("As senhas não conferem."); return; }
    setBusy(true);
    const sb = criarSupabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) { setEstado("erro"); setMsg(error.message); }
    else { setEstado("ok"); setMsg("Senha definida! Da próxima vez, entre com e-mail e senha."); setSenha(""); setConfirma(""); }
  }

  if (!aberto) {
    return <button type="button" className="link-sutil" style={{ textAlign: "left", marginTop: 10 }} onClick={() => setAberto(true)}>🔒 Definir uma senha de acesso</button>;
  }
  return (
    <div style={{ marginTop: 12 }}>
      <label className="fld-l">Nova senha</label>
      <input className="fld" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
      <label className="fld-l" style={{ marginTop: 10 }}>Confirmar</label>
      <input className="fld" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
      {msg && <p className={estado === "ok" ? "c-p" : "fld-err"} style={estado === "ok" ? { color: "#3f8f5b", marginTop: 8 } : {}}>{msg}</p>}
      <button type="button" className="pill" onClick={salvar} disabled={busy} style={{ marginTop: 12 }}>{busy ? "Salvando…" : "Salvar senha"}</button>
    </div>
  );
}
