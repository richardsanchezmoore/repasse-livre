"use client";

import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

/**
 * Faixa de retorno do checkout na /planos (`?assinatura=sucesso|cancelado`).
 *
 * Vive num componente próprio porque a /planos é ESTÁTICA (ISR): o server não lê mais
 * `searchParams` — se lesse, a rota inteira voltaria a ser dinâmica e a landing (719
 * linhas) renderizaria a cada visita de tráfego pago. Aqui o parâmetro é lido no
 * CLIENTE, então só ESTA faixa depende da URL; o resto da página vem do CDN.
 *
 * Exige <Suspense> em volta (regra do useSearchParams em rota estática) — quem renderiza
 * é o PaginaVendas/PaginaVendasSlim.
 *
 * NOTA: quem devolve pra cá é o fluxo Stripe/Asaas (api/assinatura/checkout monta
 * `/planos?assinatura=sucesso`). O gateway ATIVO hoje é a Ticto, que retorna pra
 * /bem-vindo — lá é que rola a troca do token de claim por sessão, e aquela página
 * segue force-dynamic de propósito. Ver project_repasse_livre_gateway_pagamento_woovi.
 */
export function AvisoAssinatura({ CORPO }: { CORPO: string }) {
  const aviso = useSearchParams().get("assinatura");

  if (aviso === "sucesso") {
    return (
      <div
        style={{
          background: "#0F7A3D",
          color: "#fff",
          padding: "12px clamp(20px,5vw,56px)",
          font: `600 13px ${CORPO}`,
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso PRO libera em instantes — recarregue em
        alguns segundos se ainda não apareceu.
      </div>
    );
  }

  if (aviso === "cancelado") {
    return (
      <div
        style={{
          background: "#F3F5F8",
          color: "#566577",
          padding: "12px clamp(20px,5vw,56px)",
          font: `600 13px ${CORPO}`,
          textAlign: "center",
        }}
      >
        Checkout cancelado. Quando quiser, é só voltar e assinar.
      </div>
    );
  }

  return null;
}
