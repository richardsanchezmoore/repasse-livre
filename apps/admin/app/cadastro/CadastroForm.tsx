"use client";

import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";
import { caminhoRedirectSeguro } from "@/lib/redirectSeguro";
import { IconeGoogle } from "@/components/IconeGoogle";
import { IconeFacebook } from "@/components/IconeFacebook";
import { FACEBOOK_LOGIN_ATIVO } from "@/lib/flags";

export function CadastroForm({ redirect }: { redirect?: string }) {
  const destino = caminhoRedirectSeguro(redirect);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [criando, setCriando] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const [enviandoFacebook, setEnviandoFacebook] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  async function aoCriarConta(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha !== confirmarSenha) {
      setFeedback({ tipo: "erro", texto: "As senhas não coincidem." });
      return;
    }
    if (senha.length < 6) {
      setFeedback({ tipo: "erro", texto: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    setCriando(true);
    setFeedback(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(destino)}` },
    });
    setCriando(false);
    setFeedback(
      error
        ? {
            tipo: "erro",
            texto: error.message.includes("already registered")
              ? "Esse e-mail já tem conta. Faça login."
              : "Falha ao criar conta. Tente novamente.",
          }
        : { tipo: "sucesso", texto: "Conta criada! Confira seu e-mail para confirmar antes de entrar." }
    );
  }

  async function aoConfirmarGoogle() {
    setEnviandoGoogle(true);
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(destino)}` },
    });
  }

  async function aoConfirmarFacebook() {
    setEnviandoFacebook(true);
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(destino)}` },
    });
  }

  return (
    <div className="login-formulario">
      <button
        type="button"
        className="login-botao-google"
        onClick={aoConfirmarGoogle}
        disabled={enviandoGoogle}
      >
        <IconeGoogle size={18} />
        Continuar com Google
      </button>

      {/* Login com Facebook pronto, mas escondido até o CNPJ liberar a Business
          Verification do app no Meta (ver lib/flags.ts). */}
      {FACEBOOK_LOGIN_ATIVO && (
        <button
          type="button"
          className="login-botao-facebook"
          onClick={aoConfirmarFacebook}
          disabled={enviandoFacebook}
        >
          <IconeFacebook size={18} />
          Continuar com Facebook
        </button>
      )}

      <div className="login-divisor">
        <span>ou</span>
      </div>

      <form onSubmit={aoCriarConta} className="login-form-email">
        <div className="login-campo-email">
          <Mail size={16} strokeWidth={1.75} />
          <input
            id="email"
            type="email"
            required
            aria-label="Seu e-mail"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>

        <div className="login-campo-email">
          <Lock size={16} strokeWidth={1.75} />
          <input
            id="senha"
            type="password"
            required
            aria-label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />
        </div>

        <div className="login-campo-email">
          <Lock size={16} strokeWidth={1.75} />
          <input
            id="confirmar-senha"
            type="password"
            required
            aria-label="Confirmar senha"
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(evento) => setConfirmarSenha(evento.target.value)}
          />
        </div>

        <button type="submit" className="login-botao-email" disabled={criando}>
          {criando ? "Criando…" : "Criar conta"}
        </button>
      </form>

      {feedback && (
        <p className={feedback.tipo === "erro" ? "formulario-erro" : "formulario-sucesso"}>
          {feedback.texto}
        </p>
      )}
    </div>
  );
}
