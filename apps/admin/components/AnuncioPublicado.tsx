"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ArrowRight, Lock, Loader2, LayoutDashboard } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

const CHAVE_CLAIM = "rl_claim";

/** Troca o claim por sessão (variações de verifyOtp entre versões do supabase-js). */
async function criarSessao(
  supabase: ReturnType<typeof criarSupabaseBrowser>,
  dados: { email: string; hashedToken?: string; emailOtp?: string }
): Promise<boolean> {
  const tentativas: Array<() => Promise<{ error: unknown }>> = [];
  if (dados.hashedToken) tentativas.push(() => supabase.auth.verifyOtp({ token_hash: dados.hashedToken!, type: "email" }));
  if (dados.emailOtp) {
    tentativas.push(() => supabase.auth.verifyOtp({ email: dados.email, token: dados.emailOtp!, type: "magiclink" }));
    tentativas.push(() => supabase.auth.verifyOtp({ email: dados.email, token: dados.emailOtp!, type: "email" }));
  }
  for (const tentar of tentativas) {
    try {
      const { error } = await tentar();
      if (!error) return true;
    } catch {
      /* tenta o próximo formato */
    }
  }
  return false;
}

type Fase = "carregando" | "definirSenha" | "pronto" | "loginFallback";

/**
 * Obrigado pós-pagamento do produto ANUNCIAR (Cakto, low ticket) — separado do
 * /bem-vindo (que é do Ticto: espera assíncrona + escape de iframe + copy de PRO).
 * Aqui é DIRETO: o botão de pagar salvou localStorage["rl_claim"]=anuncioId, o webhook
 * registra o claim ao publicar → troca por sessão e o vendedor cria a senha. Copy de
 * VENDEDOR (não de assinante). Ver project_repasse_livre_low_ticket_vender_anuncio.
 */
export function AnuncioPublicado({ logado }: { logado: boolean }) {
  const [fase, setFase] = useState<Fase>(logado ? "pronto" : "carregando");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current || logado) return;
    rodou.current = true;

    // Token = anuncioId. localStorage (o /vender salvou) OU ?sck da URL (fallback).
    const sck = new URLSearchParams(window.location.search).get("sck") ?? "";
    const doSck = sck.startsWith("listing_") ? sck.slice(8) : sck.startsWith("claim_") ? sck.slice(6) : null;
    let token = doSck;
    try {
      token = token ?? localStorage.getItem(CHAVE_CLAIM);
    } catch {
      /* localStorage bloqueado */
    }
    if (!token) {
      setFase("loginFallback");
      return;
    }

    (async () => {
      const supabase = criarSupabaseBrowser();
      // O webhook registra o claim ao processar a compra — pode cair 1-2s depois.
      for (let i = 0; i < 40; i++) {
        let r: { pronto?: boolean; aguardando?: boolean; email?: string; hashedToken?: string; emailOtp?: string };
        try {
          const resp = await fetch("/api/claim", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          });
          r = await resp.json();
        } catch {
          break;
        }
        if (r.pronto && r.email) {
          const ok = await criarSessao(supabase, { email: r.email, hashedToken: r.hashedToken, emailOtp: r.emailOtp });
          try {
            localStorage.removeItem(CHAVE_CLAIM);
          } catch {
            /* ok */
          }
          setFase(ok ? "definirSenha" : "loginFallback");
          return;
        }
        if (!r.aguardando) break;
        await new Promise((res) => setTimeout(res, 3000));
      }
      setFase("loginFallback");
    })();
  }, [logado]);

  async function aoDefinirSenha(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha.length < 6) {
      setErro("Use ao menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const supabase = criarSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar a senha agora. Tente de novo.");
      return;
    }
    setFase("pronto");
  }

  return (
    <div className="bemvindo">
      <div className="bemvindo-card">
        <span className="bemvindo-check">
          <BadgeCheck size={40} strokeWidth={2} />
        </span>
        <h1 className="bemvindo-titulo">
          {fase === "carregando" ? "Recebendo seu anúncio…" : "Anúncio no ar! 🎉"}
        </h1>
        <p className="bemvindo-sub">
          {fase === "carregando"
            ? "Confirmando seu pagamento — deixe esta aba aberta que já liberamos aqui."
            : "Pagamento confirmado e seu carro já entrou na vitrine abaixo da FIPE — visto por quem procura exatamente esse tipo de oportunidade."}
        </p>

        {fase === "carregando" && (
          <>
            <p className="bemvindo-nota bemvindo-carregando">
              <Loader2 size={18} className="bemvindo-spin" strokeWidth={2.2} /> Confirmando o pagamento…
            </p>
            <Link href="/login?redirect=%2Fconta" className="bemvindo-secundario">
              Já paguei — prefiro entrar com meu email
            </Link>
          </>
        )}

        {fase === "definirSenha" && (
          <form onSubmit={aoDefinirSenha} className="bemvindo-form">
            <p className="bemvindo-nota">
              <strong>Crie uma senha</strong> pra administrar seu anúncio quando quiser (sua conta já está pronta).
            </p>
            <div className="login-campo-email">
              <Lock size={16} strokeWidth={1.75} />
              <input
                type="password"
                required
                autoFocus
                aria-label="Crie sua senha"
                placeholder="Crie sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <button type="submit" className="bemvindo-cta" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar e administrar meu anúncio"}
              {!salvando && <ArrowRight size={18} strokeWidth={2.2} />}
            </button>
            <button type="button" className="bemvindo-secundario" onClick={() => setFase("pronto")}>
              Depois eu defino
            </button>
            {erro && <p className="formulario-erro">{erro}</p>}
          </form>
        )}

        {fase === "pronto" && (
          <>
            <Link href="/conta" className="bemvindo-cta">
              <LayoutDashboard size={18} strokeWidth={2.2} /> Administrar meu anúncio
            </Link>
            <Link href="/" className="bemvindo-secundario">
              Ver a vitrine de oportunidades
            </Link>
          </>
        )}

        {fase === "loginFallback" && (
          <>
            <p className="bemvindo-nota">
              Falta 1 passo: <strong>entre com o mesmo email que você usou na compra</strong> pra administrar seu anúncio.
            </p>
            <Link href="/login?redirect=%2Fconta" className="bemvindo-cta">
              <ArrowRight size={18} strokeWidth={2.2} /> Entrar e administrar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
