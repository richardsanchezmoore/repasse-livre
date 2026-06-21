"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

// O link do e-mail de redefinição cai aqui com ?code=... na URL; o client
// do Supabase (detectSessionInUrl, padrão) já troca isso por sessão ao
// carregar a página, então só precisamos chamar updateUser com a nova senha.
export function RedefinirSenhaForm() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function aoSalvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha !== confirmarSenha) {
      setFeedback("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setFeedback("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    setFeedback(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setFeedback("Falha ao salvar a nova senha. Peça um novo link de redefinição.");
      return;
    }
    // O link de redefinição já estabelece sessão (é assim que o updateUser
    // acima consegue rodar) — manda direto pra área logada em vez de pedir
    // a senha de novo em /login.
    window.location.href = "/";
  }

  return (
    <form onSubmit={aoSalvar} className="login-form-email">
      <label htmlFor="senha" className="campo-titulo-grupo">
        Nova senha
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
        Confirmar nova senha
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

      <button type="submit" className="login-botao-email" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar nova senha"}
      </button>

      {feedback && <p className="login-feedback">{feedback}</p>}
    </form>
  );
}
