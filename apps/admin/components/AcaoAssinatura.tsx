"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Settings } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/**
 * CTA da página de planos. Três estados, decididos no server (obterUsuarioAtual):
 *  - "entrar": deslogado → manda pro login (com redirect de volta pra /planos).
 *  - "assinar": logado sem assinatura → POST /api/assinatura/checkout → Stripe.
 *  - "gerenciar": já assinante → POST /api/assinatura/portal → Customer Portal.
 */
export function AcaoAssinatura({
  estado,
  rotulo,
}: {
  estado: "entrar" | "assinar" | "gerenciar";
  rotulo?: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function aoClicar() {
    if (estado === "entrar") {
      registrarEvento("clique_assinar", { origem: "planos", estado: "deslogado" });
      router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
      return;
    }

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
    <button type="button" className="planos-cta" onClick={aoClicar} disabled={carregando}>
      <Icone size={17} strokeWidth={2} />
      {carregando ? "Abrindo…" : texto}
    </button>
  );
}
