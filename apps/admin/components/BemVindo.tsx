"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ArrowRight, Compass, Lock, Loader2 } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

const CHAVE_DESTINO = "rl_destino_pos_compra";
const CHAVE_CLAIM = "rl_claim";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fase = "carregando" | "definirSenha" | "destino" | "loginFallback";

/** Troca as credenciais do claim por uma sessão. Tenta variações de verifyOtp
 * (o formato varia entre versões do supabase-js) — a 1ª que colar cria a sessão. */
async function criarSessao(
  supabase: ReturnType<typeof criarSupabaseBrowser>,
  dados: { email: string; hashedToken?: string; emailOtp?: string }
): Promise<boolean> {
  const tentativas: Array<() => Promise<{ error: unknown }>> = [];
  if (dados.hashedToken) {
    tentativas.push(() => supabase.auth.verifyOtp({ token_hash: dados.hashedToken!, type: "email" }));
  }
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

/**
 * Boas-vindas pós-compra (destino do "acessar produto" da Cakto).
 *
 * Guest zero-clique: se o comprador não estava logado, o token de claim (gerado
 * em /planos, amarrado à conta pelo webhook) é trocado por uma sessão — auto-login
 * SEM email — e ele só define a senha (conta completa p/ os próximos acessos).
 * Sem token (pagou em outro aparelho/localStorage limpo) → cai no login por email.
 *
 * Destino inteligente: anúncio fechado → volta pro carro; campanha → home.
 */
export function BemVindo({ logado }: { logado: boolean }) {
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>(logado ? "destino" : "carregando");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;

    // Destino guardado ao clicar num anúncio fechado (CapturaDestino em /planos).
    const d = localStorage.getItem(CHAVE_DESTINO);
    if (d && UUID.test(d)) setDestinoId(d);
    if (d) localStorage.removeItem(CHAVE_DESTINO);

    if (logado) return; // já tem sessão (comprador logado) → mostra destino direto

    const token = localStorage.getItem(CHAVE_CLAIM);
    if (!token) {
      setFase("loginFallback");
      return;
    }

    (async () => {
      const supabase = criarSupabaseBrowser();
      // O comprador cai aqui antes do webhook gravar o claim → re-tenta. Pix Automático
      // é ASSÍNCRONO (o débito confirma minutos depois), então esperamos ~37s; se não
      // fechar nesse tempo, cai no login por email (a conta+premium já são criados pelo
      // webhook quando o pagamento confirmar).
      for (let i = 0; i < 15; i++) {
        let resposta: {
          pronto?: boolean;
          aguardando?: boolean;
          email?: string;
          hashedToken?: string;
          emailOtp?: string;
        };
        try {
          const r = await fetch("/api/claim", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          });
          resposta = await r.json();
        } catch {
          break;
        }
        if (resposta.pronto && resposta.email) {
          const ok = await criarSessao(supabase, {
            email: resposta.email,
            hashedToken: resposta.hashedToken,
            emailOtp: resposta.emailOtp,
          });
          localStorage.removeItem(CHAVE_CLAIM);
          setFase(ok ? "definirSenha" : "loginFallback");
          return;
        }
        if (!resposta.aguardando) break; // expirado/consumido → fallback
        await new Promise((res) => setTimeout(res, 2500)); // espera o webhook
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
    setFase("destino");
  }

  const destino = destinoId ? `/oportunidade/${destinoId}` : "/";

  const botoesDestino = destinoId ? (
    <>
      <Link href={destino} className="bemvindo-cta">
        <ArrowRight size={18} strokeWidth={2.2} /> Voltar pro carro que você queria
      </Link>
      <Link href="/" className="bemvindo-secundario">
        Explorar todas as oportunidades
      </Link>
    </>
  ) : (
    <Link href="/" className="bemvindo-cta">
      <Compass size={18} strokeWidth={2.2} /> Explorar as oportunidades
    </Link>
  );

  return (
    <div className="bemvindo">
      <div className="bemvindo-card">
        <span className="bemvindo-check">
          <BadgeCheck size={40} strokeWidth={2} />
        </span>
        <h1 className="bemvindo-titulo">Bem-vindo ao Repasse Livre PRO! 🎉</h1>
        <p className="bemvindo-sub">
          Pagamento aprovado — seu acesso já está <strong>liberado</strong>. Agora você enxerga o mercado como
          ninguém: todas as ofertas abaixo da FIPE, o Copiloto e a inteligência da BIA na sua mão.
        </p>

        {fase === "carregando" && (
          <p className="bemvindo-nota bemvindo-carregando">
            <Loader2 size={18} className="bemvindo-spin" strokeWidth={2.2} /> Ativando seu acesso…
          </p>
        )}

        {fase === "destino" && botoesDestino}

        {fase === "definirSenha" && (
          <form onSubmit={aoDefinirSenha} className="bemvindo-form">
            <p className="bemvindo-nota">
              <strong>Crie uma senha</strong> pra acessar quando quiser (é só isso — sua conta já está pronta).
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
              {salvando ? "Salvando…" : "Salvar e acessar"}
              {!salvando && <ArrowRight size={18} strokeWidth={2.2} />}
            </button>
            <button type="button" className="bemvindo-secundario" onClick={() => setFase("destino")}>
              Depois eu defino
            </button>
            {erro && <p className="formulario-erro">{erro}</p>}
          </form>
        )}

        {fase === "loginFallback" && (
          <>
            <p className="bemvindo-nota">
              Falta 1 passo: <strong>entre com o mesmo email que você usou na compra</strong> pra acessar.
              <br />
              <span style={{ fontSize: 12.5, opacity: 0.85 }}>
                Pagou via Pix Automático? A confirmação leva alguns minutos — se ainda não liberou, é só entrar de novo em instantes.
              </span>
            </p>
            <Link href={`/login?redirect=${encodeURIComponent(destino)}`} className="bemvindo-cta">
              <ArrowRight size={18} strokeWidth={2.2} /> Entrar e acessar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
