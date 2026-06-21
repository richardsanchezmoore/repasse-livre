"use client";

import { useRef, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function aoEntrar(evento: React.FormEvent) {
    evento.preventDefault();
    const emailAtual = emailInputRef.current?.value || email;
    setEntrando(true);
    setFeedback(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email: emailAtual, password: senha });
    setEntrando(false);
    if (error) {
      setFeedback("E-mail ou senha incorretos.");
      return;
    }
    window.location.href = "/";
  }

  async function aoRedefinirSenha(evento: React.FormEvent) {
    evento.preventDefault();
    // O autopreenchimento do navegador (autofill) às vezes não dispara o
    // onChange a tempo de atualizar o estado — lê o valor direto do input
    // como fonte de verdade, não só o state.
    const emailAtual = emailInputRef.current?.value || email;
    if (!emailAtual) {
      setFeedback("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    setEnviandoRecuperacao(true);
    setFeedback(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(emailAtual, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviandoRecuperacao(false);
    setFeedback(
      error ? "Falha ao enviar o link de redefinição." : "Link de redefinição enviado! Confira seu e-mail."
    );
  }

  async function aoEntrarComGoogle() {
    setEnviandoGoogle(true);
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function alternarParaRecuperar() {
    setFeedback(null);
    setModo("recuperar");
  }

  function alternarParaLogin() {
    setFeedback(null);
    setModo("login");
  }

  return (
    <div className="login-formulario">
      <button
        type="button"
        className="login-botao-google"
        onClick={aoEntrarComGoogle}
        disabled={enviandoGoogle}
      >
        Continuar com Google
      </button>

      <div className="login-divisor">
        <span>ou</span>
      </div>

      <form onSubmit={modo === "login" ? aoEntrar : aoRedefinirSenha} className="login-form-email">
        <label htmlFor="email" className="campo-titulo-grupo">
          Seu e-mail
        </label>
        <div className="login-campo-email">
          <Mail size={16} strokeWidth={1.75} />
          <input
            ref={emailInputRef}
            id="email"
            type="email"
            required
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>

        {modo === "login" && (
          <>
            <label htmlFor="senha" className="campo-titulo-grupo">
              Senha
            </label>
            <div className="login-campo-email">
              <Lock size={16} strokeWidth={1.75} />
              <input
                id="senha"
                type="password"
                required
                placeholder="Sua senha"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
              />
            </div>
          </>
        )}

        {modo === "login" ? (
          <button type="submit" className="login-botao-email" disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        ) : (
          <button type="submit" className="login-botao-email" disabled={enviandoRecuperacao}>
            {enviandoRecuperacao ? "Enviando…" : "Redefinir Senha"}
          </button>
        )}
      </form>

      {modo === "login" ? (
        <button type="button" className="login-link-secundario" onClick={alternarParaRecuperar}>
          Esqueci minha senha
        </button>
      ) : (
        <button type="button" className="login-link-secundario" onClick={alternarParaLogin}>
          Voltar para login
        </button>
      )}

      {feedback && <p className="login-feedback">{feedback}</p>}
    </div>
  );
}
