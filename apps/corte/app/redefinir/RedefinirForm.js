"use client";
import { useEffect, useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function RedefinirForm() {
  // null = verificando o link · true = sessão de recuperação ok · false = link inválido/expirado
  const [pronto, setPronto] = useState(null);
  const [f, setF] = useState({ senha: "", confirma: "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    // O /auth/callback já trocou o código do link por sessão antes de cair aqui.
    const sb = criarSupabaseBrowser();
    sb.auth.getUser().then(({ data }) => setPronto(!!data.user));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    if (f.senha.length < 6) { setErro("Use ao menos 6 caracteres."); return; }
    if (f.senha !== f.confirma) { setErro("As senhas não conferem."); return; }
    setBusy(true);
    const sb = criarSupabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: f.senha });
    setBusy(false);
    if (error) { setErro("Não consegui salvar a senha agora. Tente de novo."); return; }
    window.location.href = "/biblioteca";
  }

  if (pronto === null) {
    return <p className="c-p">Verificando o link…</p>;
  }
  if (pronto === false) {
    return (
      <div>
        <div className="c-t">Link inválido ou expirado</div>
        <p className="c-p">Peça um novo em <a href="/entrar" style={{ color: "var(--wine)", borderBottom: "1px solid var(--gold)" }}>Entrar → “Esqueci minha senha”</a>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={salvar}>
      <label className="fld-l">Nova senha</label>
      <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="new-password" required autoFocus />
      <label className="fld-l" style={{ marginTop: 12 }}>Confirmar senha</label>
      <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
      {erro && <p className="fld-err">{erro}</p>}
      <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
        {busy ? "Salvando…" : "Salvar e entrar →"}
      </button>
    </form>
  );
}
