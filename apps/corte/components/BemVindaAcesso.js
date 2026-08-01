"use client";
import { useEffect, useRef, useState } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";
import { definirAcessoBoasVindas } from "@/app/bem-vinda/actions";

/** Troca as credenciais do claim por uma sessão (variações de verifyOtp entre versões). */
async function criarSessao(sb, { email, hashedToken, emailOtp }) {
  const tentativas = [];
  if (hashedToken) tentativas.push(() => sb.auth.verifyOtp({ token_hash: hashedToken, type: "email" }));
  if (emailOtp) {
    tentativas.push(() => sb.auth.verifyOtp({ email, token: emailOtp, type: "magiclink" }));
    tentativas.push(() => sb.auth.verifyOtp({ email, token: emailOtp, type: "email" }));
  }
  for (const tentar of tentativas) {
    try { const { error } = await tentar(); if (!error) return true; } catch { /* próximo */ }
  }
  return false;
}

export default function BemVindaAcesso({ emailInicial }) {
  // fase: verificando (auto-login por claim) · senha (logada, só cria senha) · form (fallback e-mail+senha)
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
    // Token do claim: ?sck=claim_{token} na URL (Cakto propaga) OU localStorage (BotaoCompra).
    let token = null;
    try {
      const sck = new URLSearchParams(window.location.search).get("sck") || "";
      token = sck.startsWith("claim_") ? sck.slice(6) : localStorage.getItem("corte_claim");
    } catch { /* sem storage */ }
    if (!token) return; // sem token → fica no form de fallback

    setFase("verificando");
    (async () => {
      const sb = criarSupabaseBrowser();
      // A compradora pode cair aqui antes do webhook gravar o claim → verifica em background.
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
          try { localStorage.removeItem("corte_claim"); } catch {}
          setFase(ok ? "senha" : "form");
          return;
        }
        if (!r.aguardando) break; // expirado/consumido → fallback
        await new Promise((res) => setTimeout(res, 4000)); // espera o webhook
      }
      setFase("form");
    })();
  }, []);

  // Fase "senha": já logada via claim, só cria a senha e entra.
  async function salvarSenha(e) {
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

  // Fase "form": fallback (pagou em outro aparelho / storage limpo) → e-mail + senha.
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

  if (fase === "verificando") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="c-t">Confirmando o seu acesso…</div>
        <p className="c-p">Deixe esta tela aberta — assim que o pagamento cair, você entra automaticamente. ✧</p>
        <div className="bv-spin" aria-hidden />
      </div>
    );
  }

  if (fase === "senha") {
    return (
      <form onSubmit={salvarSenha}>
        <div className="c-t" style={{ marginBottom: 4 }}>Acesso liberado! 👑</div>
        <p className="c-p" style={{ marginBottom: 10 }}>Crie uma senha para entrar quando quiser — só isso.</p>
        <label className="fld-l">Crie uma senha</label>
        <input className="fld" type="password" value={f.senha} onChange={up("senha")} placeholder="••••••••" autoComplete="new-password" required autoFocus />
        <label className="fld-l" style={{ marginTop: 12 }}>Confirmar senha</label>
        <input className="fld" type="password" value={f.confirma} onChange={up("confirma")} placeholder="••••••••" autoComplete="new-password" required />
        {erro && <p className="fld-err">{erro}</p>}
        <button className="pill" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
          {busy ? "Entrando…" : "Definir senha e entrar →"}
        </button>
      </form>
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
