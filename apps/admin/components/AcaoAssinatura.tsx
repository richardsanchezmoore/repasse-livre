"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Settings } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/**
 * CTA da página de planos. Estados decididos no server (obterUsuarioAtual):
 *  - "entrar": deslogado → login (com redirect de volta pra /planos).
 *  - "assinar": logado sem assinatura → vai pro checkout da Cakto (`checkoutUrl`,
 *    já com ?sck={user_id}) se configurado; senão cai no checkout Stripe (legado).
 *  - "gerenciar": já assinante → WhatsApp de suporte (`gerenciarUrl`) se houver;
 *    senão Customer Portal do Stripe (legado).
 */
export function AcaoAssinatura({
  estado,
  rotulo,
  checkoutUrl = null,
  gerenciarUrl = null,
  gateway = null,
  className,
}: {
  estado: "entrar" | "assinar" | "gerenciar";
  rotulo?: string;
  /** URL de checkout da Cakto (com ?sck=), quando configurada. */
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

  async function aoClicar() {
    if (estado === "entrar") {
      registrarEvento("clique_assinar", { origem: "planos", estado: "deslogado" });
      router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
      return;
    }

    // Asaas: assinar → cria a assinatura via API e redireciona pra fatura. Exige
    // login (a assinatura fica atrelada à conta via externalReference). 401 → login.
    if (estado === "assinar" && gateway === "asaas") {
      registrarEvento("clique_assinar", { origem: "planos", estado, gateway: "asaas" });
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

    // Cakto: assinar → checkout hospedado.
    if (estado === "assinar" && checkoutUrl) {
      registrarEvento("clique_assinar", { origem: "planos", estado, gateway: "cakto" });
      let url = checkoutUrl;
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
    if (estado === "gerenciar" && gerenciarUrl) {
      window.location.href = gerenciarUrl;
      return;
    }

    // Fallback legado (Stripe): checkout/portal via API.
    setCarregando(true);
    try {
      const rota = estado === "gerenciar" ? "/api/assinatura/portal" : "/api/assinatura/checkout";
      registrarEvento("clique_assinar", { origem: "planos", estado });
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

  const Icone = estado === "gerenciar" ? Settings : Gem;
  const texto = rotulo ?? (estado === "gerenciar" ? "Gerenciar assinatura" : "Quero ser premium");

  return (
    <button type="button" className={className ?? "planos-cta"} onClick={aoClicar} disabled={carregando}>
      <Icone size={17} strokeWidth={2} />
      {carregando ? "Abrindo…" : texto}
    </button>
  );
}
