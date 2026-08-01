"use client";
import { useState } from "react";
import { definirAcessoBoasVindas } from "@/app/bem-vinda/actions";

export default function BemVindaAcesso({ emailInicial }) {
  const [f, setF] = useState({ email: emailInicial || "", senha: "", confirma: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [jaTem, setJaTem] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

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
        <div className="c-t">Esta conta já tem senha ✧</div>
        <p className="c-p">É só entrar com o seu e-mail e a senha que você criou.</p>
        <a href="/entrar" className="pill" style={{ marginTop: 12 }}>Ir para o login →</a>
      </div>
    );
  }
  return (
    <form onSubmit={enviar}>
      <label className="fld-l">E-mail da sua compra</label>
      <input className="fld" type="email" value={f.email} onChange={up("email")} placeholder="voce@email.com" autoComplete="email" required />
      <label className="fld-l" style={{ marginTop: 12 }}>Crie uma senha</label>
      <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="new-password" required />
      <label className="fld-l" style={{ marginTop: 12 }}>Confirmar senha</label>
      <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
      {erro && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
        {busy ? "Entrando…" : "Definir senha e entrar →"}
      </button>
    </form>
  );
}
