"use client";

import Link from "next/link";
import { Gem, Lock } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/**
 * Bloco premium do FIM da página individual: a página fica toda aberta (foto,
 * ganho, ficha, análise — isca pro tráfego de Ads e SEO), e SÓ o acesso ao
 * anúncio original (link + WhatsApp do vendedor) é trocado por este convite a
 * assinar. É o ativo que a plataforma vende: chegar ao carro/vendedor. Leva pra
 * /planos e registra o clique com origem "pagina". Ver
 * project_repasse_livre_premium_monetizacao.
 */
export function BlocoAcessoBloqueado({ oportunidadeId }: { oportunidadeId: string }) {
  return (
    <Link
      href="/planos"
      className="acesso-bloqueado"
      onClick={() => registrarEvento("clique_overlay_premium", { origem: "pagina" }, oportunidadeId)}
    >
      <span className="acesso-bloqueado-selo">
        <Lock size={14} strokeWidth={2.25} /> Acesso exclusivo
      </span>
      <p className="acesso-bloqueado-titulo">Veja o anúncio original e fale direto com o vendedor</p>
      <p className="acesso-bloqueado-frase">Disponível apenas no plano</p>
      <span className="acesso-bloqueado-cta">
        <Gem size={17} strokeWidth={2} /> Fazer upgrade
      </span>
    </Link>
  );
}
