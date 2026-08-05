"use client";
import { useState } from "react";
import { criarConta, entrarComSenha } from "./actions";

export default function EntrarForm() {
  const [aba, setAba] = useState("criar"); // criar | entrar
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const r = aba === "criar"
        ? await criarConta({ nome, email, senha })
        : await entrarComSenha({ email, senha });
      if (r?.erro) setErro(r.erro); // sucesso redireciona no servidor
    } catch {
      setErro("Algo deu errado. Tente de novo.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={enviar} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="tabs">
        <button type="button" className={aba === "criar" ? "on" : ""} onClick={() => setAba("criar")}>Criar conta</button>
        <button type="button" className={aba === "entrar" ? "on" : ""} onClick={() => setAba("entrar")}>Já tenho conta</button>
      </div>

      {aba === "criar" && (
        <div className="field">
          <label>Seu nome</label>
          <input className="inp" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como a Marta vai te chamar" autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label>E-mail</label>
        <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
      </div>
      <div className="field">
        <label>Senha</label>
        <input className="inp" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          placeholder={aba === "criar" ? "mínimo 6 caracteres" : "sua senha"} autoComplete={aba === "criar" ? "new-password" : "current-password"} />
      </div>

      {erro && <p className="erro">{erro}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Um instante…" : aba === "criar" ? "Criar minha conta →" : "Entrar →"}
      </button>
    </form>
  );
}
