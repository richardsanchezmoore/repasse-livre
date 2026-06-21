"use client";

import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

export function CadastroForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [criando, setCriando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function aoCriarConta(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha !== confirmarSenha) {
      setFeedback("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setFeedback("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCriando(true);
    setFeedback(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setCriando(false);
    setFeedback(
      error
        ? error.message.includes("already registered")
          ? "Esse e-mail já tem conta. Faça login."
          : "Falha ao criar conta. Tente novamente."
        : "Conta criada! Confira seu e-mail para confirmar antes de entrar."
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

      <form onSubmit={aoCriarConta} className="login-form-email">
        <label htmlFor="email" className="campo-titulo-grupo">
          Seu e-mail
        </label>
        <div className="login-campo-email">
          <Mail size={16} strokeWidth={1.75} />
          <input
            id="email"
            type="email"
            required
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>

        <label htmlFor="senha" className="campo-titulo-grupo">
          Senha
        </label>
        <div className="login-campo-email">
          <Lock size={16} strokeWidth={1.75} />
          <input
            id="senha"
            type="password"
            required
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />
        </div>

        <label htmlFor="confirmar-senha" className="campo-titulo-grupo">
          Confirmar senha
        </label>
        <div className="login-campo-email">
          <Lock size={16} strokeWidth={1.75} />
          <input
            id="confirmar-senha"
            type="password"
            required
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(evento) => setConfirmarSenha(evento.target.value)}
          />
        </div>

        <button type="submit" className="login-botao-email" disabled={criando}>
          {criando ? "Criando…" : "Criar conta"}
        </button>
      </form>

      {feedback && <p className="login-feedback">{feedback}</p>}
    </div>
  );
}
