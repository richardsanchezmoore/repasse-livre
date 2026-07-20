"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Settings } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";
import { pushDL } from "@/lib/dataLayer";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * CTA da página de planos. Estados:
 *  - "entrar": deslogado → login (com redirect de volta pra /planos).
 *  - "assinar": sem assinatura → checkout hospedado (`checkoutUrl`) se configurado;
 *    senão cai no checkout Stripe (legado).
 *  - "gerenciar": já assinante → WhatsApp de suporte (`gerenciarUrl`) se houver;
 *    senão Customer Portal do Stripe (legado).
 *  - ★ "auto": o chamador NÃO sabe quem é o usuário → este componente descobre no
 *    CLIENTE. É o modo da /planos, que é ESTÁTICA (ISR) pra não renderizar 719
 *    linhas de landing a cada visita de tráfego pago. Ver o comentário do revalidate lá.
 *
 * Por que dá pra resolver no cliente: `perfis` tem a política RLS `perfis_select_proprio`
 * (migration 0009, `using user_id = auth.uid()`), então o próprio usuário lê o seu perfil
 * com a anon key. A conversa é direta com o Supabase — NÃO passa por função da Vercel.
 */
export function AcaoAssinatura({
  estado,
  rotulo,
  checkoutUrl = null,
  gerenciarUrl = null,
  gateway = null,
  className,
}: {
  estado: "entrar" | "assinar" | "gerenciar" | "auto";
  rotulo?: string;
  /** URL de checkout hospedado. No modo "auto" vem SEM `sck` (a página é estática); o
   *  `sck` do logado é anexado aqui, e o deslogado segue no token de claim. */
  checkoutUrl?: string | null;
  /** URL de gestão da assinatura (WhatsApp de suporte), quando disponível. */
  gerenciarUrl?: string | null;
  /** Gateway ativo — "asaas" usa o fluxo API-driven (/api/assinatura/asaas). */
  gateway?: string | null;
  /** Classe do botão. Default `planos-cta`; a landing passa `rlv-cta` (design novo). */
  className?: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  // No modo "auto" o servidor não sabe a sessão: parte de "assinar" (o caso da esmagadora
  // maioria em tráfego pago) e corrige na hidratação se for assinante. Falha = mostrar
  // "assinar" pra quem já assina — chato, nunca perda: o clique ainda cai no checkout.
  const [estadoAuto, setEstadoAuto] = useState<"assinar" | "gerenciar">("assinar");
  const [sckUsuario, setSckUsuario] = useState<string | null>(null);
  const efetivo = estado === "auto" ? estadoAuto : estado;

  useEffect(() => {
    if (estado !== "auto") return;
    let vivo = true;
    void (async () => {
      try {
        const supabase = criarSupabaseBrowser();
        // getSession() lê o cookie local (sem ida à rede). Basta: aqui só escolhemos
        // rótulo/URL — quem autoriza de verdade é o webhook do gateway.
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user || !vivo) return;
        setSckUsuario(user.id);
        const { data: perfil } = await supabase
          .from("perfis")
          .select("assinatura_status, premium_expira_em")
          .eq("user_id", user.id)
          .single();
        // Mesmo critério do obterUsuarioAtual: status ativo/trial E período não expirado.
        const statusAtivo = perfil?.assinatura_status === "active" || perfil?.assinatura_status === "trialing";
        const dentroDaValidade = perfil?.premium_expira_em
          ? new Date(perfil.premium_expira_em).getTime() > Date.now()
          : false;
        if (vivo && statusAtivo && dentroDaValidade) setEstadoAuto("gerenciar");
      } catch {
        /* sem sessão / rede ruim → segue como "assinar" (o fluxo de guest cobre) */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [estado]);

  async function aoClicar() {
    if (efetivo === "entrar") {
      registrarEvento("clique_assinar", { origem: "planos", estado: "deslogado" });
      router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
      return;
    }

    // Asaas: assinar → cria a assinatura via API e redireciona pra fatura. Exige
    // login (a assinatura fica atrelada à conta via externalReference). 401 → login.
    if (efetivo === "assinar" && gateway === "asaas") {
      registrarEvento("clique_assinar", { origem: "planos", estado: efetivo, gateway: "asaas" });
      pushDL("iniciar_checkout", { moeda: "BRL", gateway });
      setCarregando(true);
      try {
        const resposta = await fetch("/api/assinatura/asaas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        if (resposta.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
          return;
        }
        const dados = (await resposta.json()) as { url?: string; erro?: string };
        if (dados.url) {
          window.location.href = dados.url;
          return;
        }
        throw new Error(dados.erro ?? "sem_url");
      } catch {
        setCarregando(false);
        alert("Não foi possível abrir o pagamento agora. Tente novamente em instantes.");
      }
      return;
    }

    // Cakto/Ticto: assinar → checkout hospedado.
    if (efetivo === "assinar" && checkoutUrl) {
      registrarEvento("clique_assinar", { origem: "planos", estado: efetivo, gateway: "cakto" });
      pushDL("iniciar_checkout", { moeda: "BRL", gateway });
      let url = checkoutUrl;
      // Logado no modo "auto": a página é estática e não pôde anexar o sck no server,
      // então anexa aqui (match EXATO por user_id). Antes do bloco de claim de propósito:
      // com sck do usuário, o `url.includes("sck=")` abaixo é pulado.
      if (sckUsuario && !url.includes("sck=")) {
        url += (url.includes("?") ? "&" : "?") + "sck=" + sckUsuario;
      }
      // Deslogado: checkoutUrl vem SEM sck. Gera um token de claim (localStorage +
      // ?sck=claim_{token}) → o webhook amarra o pagamento à conta e o /bem-vindo
      // troca por sessão (auto-login sem email). Ver componentes/BemVindo + /api/claim.
      if (!url.includes("sck=")) {
        const token = crypto.randomUUID();
        try {
          localStorage.setItem("rl_claim", token);
        } catch {
          /* localStorage bloqueado (aba anônima estrita) → cai no fallback de login por email */
        }
        url += (url.includes("?") ? "&" : "?") + "sck=claim_" + token;
      }
      window.location.href = url;
      return;
    }

    // Cakto: gerenciar → suporte (Cakto não tem portal como o Stripe).
    if (efetivo === "gerenciar" && gerenciarUrl) {
      window.location.href = gerenciarUrl;
      return;
    }

    // Fallback legado (Stripe): checkout/portal via API.
    setCarregando(true);
    try {
      const rota = efetivo === "gerenciar" ? "/api/assinatura/portal" : "/api/assinatura/checkout";
      registrarEvento("clique_assinar", { origem: "planos", estado: efetivo });
      if (efetivo === "assinar") pushDL("iniciar_checkout", { moeda: "BRL", gateway });
      const resposta = await fetch(rota, { method: "POST" });
      if (resposta.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
        return;
      }
      const dados = (await resposta.json()) as { url?: string; erro?: string };
      if (dados.url) {
        window.location.href = dados.url;
        return;
      }
      throw new Error(dados.erro ?? "sem_url");
    } catch {
      setCarregando(false);
      alert("Não foi possível abrir o pagamento agora. Tente novamente em instantes.");
    }
  }

  const Icone = efetivo === "gerenciar" ? Settings : Gem;
  // "gerenciar" manda no rótulo: no modo "auto" o chamador passa o texto de venda sem
  // saber que o visitante já assina.
  const texto = efetivo === "gerenciar" ? "Gerenciar assinatura" : (rotulo ?? "Quero ser premium");

  return (
    <button type="button" className={className ?? "planos-cta"} onClick={aoClicar} disabled={carregando}>
      <Icone size={17} strokeWidth={2} />
      {carregando ? "Abrindo…" : texto}
    </button>
  );
}
