"use client";

import Link from "next/link";
import { Gem, Lock } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/**
 * Teaser da aba "Copiloto" para NÃO-pagos: mostra só as 2 primeiras linhas do
 * parecer (as únicas que vão pro DOM — o resto NÃO é renderizado, senão o
 * visitante free leria a análise inteira via "inspecionar"), com um gradiente
 * cobrindo o fim e o mesmo bloco de upgrade do acesso ao anúncio. "Aquele
 * gostinho". Ver project_repasse_livre_premium_monetizacao.
 */
export function CopilotoTeaser({
  resumo,
  oportunidadeId,
}: {
  /** Prévia já truncada (2 linhas) do parecer; null quando o anúncio ainda não
   * tem parecer gerado — cai num texto genérico de upsell. */
  resumo: string | null;
  oportunidadeId: string;
}) {
  return (
    <div className="copiloto-teaser">
      <div className="copiloto-teaser-amostra">
        <h2 className="copiloto-teaser-titulo">Análise do Copiloto</h2>
        <p className="copiloto-teaser-texto">
          {resumo ??
            "Veredito do especialista sobre este anúncio: preço vs. mercado, quilometragem, procedência e a posição dele no ranking do modelo."}
        </p>
      </div>

      <Link
        href="/planos"
        className="acesso-bloqueado acesso-bloqueado-gradiente"
        onClick={() => registrarEvento("clique_overlay_premium", { origem: "copiloto" }, oportunidadeId)}
      >
        <span className="acesso-bloqueado-selo">
          <Lock size={14} strokeWidth={2.25} /> Acesso exclusivo
        </span>
        <p className="acesso-bloqueado-titulo">Veja a análise completa do Copiloto</p>
        <p className="acesso-bloqueado-frase">Disponível apenas no plano</p>
        <span className="acesso-bloqueado-cta">
          <Gem size={17} strokeWidth={2} /> Fazer upgrade
        </span>
      </Link>
    </div>
  );
}
