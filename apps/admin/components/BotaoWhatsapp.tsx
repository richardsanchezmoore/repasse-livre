"use client";

import { MessageCircle } from "lucide-react";
import { registrarEvento } from "@/lib/eventosAnalytics";
import { formatarWhatsapp } from "@/lib/mascaras";

export function BotaoWhatsapp({
  opportunityId,
  whatsapp,
  nomeRemetente,
}: {
  opportunityId: string;
  whatsapp: string;
  nomeRemetente: string | null;
}) {
  return (
    <a
      href={`https://wa.me/55${whatsapp}`}
      target="_blank"
      rel="noreferrer"
      className="botao-whatsapp-pagina"
      onClick={() => registrarEvento("clique_whatsapp", { origem: "pagina_individual" }, opportunityId)}
    >
      <MessageCircle size={18} strokeWidth={2} />
      Falar com {nomeRemetente || "o vendedor"} no WhatsApp
      <span className="botao-whatsapp-pagina-numero">{formatarWhatsapp(whatsapp)}</span>
    </a>
  );
}
