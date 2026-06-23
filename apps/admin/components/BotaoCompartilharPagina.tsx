"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { gerarTextoCompartilhamento } from "@/lib/compartilhamento";
import type { Oportunidade } from "@/lib/types";

export function BotaoCompartilharPagina({ oportunidade, url }: { oportunidade: Oportunidade; url: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function aoCompartilhar() {
    const texto = gerarTextoCompartilhamento(oportunidade);
    if (navigator.share) {
      try {
        await navigator.share({ title: oportunidade.veiculo, text: texto, url });
        return;
      } catch {
        // Usuário cancelou o share nativo — não é erro, só não faz nada.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
      setFeedback("Texto copiado!");
    } catch {
      setFeedback("Não foi possível copiar.");
    }
    setTimeout(() => setFeedback(null), 1500);
  }

  return (
    <button type="button" onClick={aoCompartilhar} className="botao-compartilhar-pagina">
      <Share2 size={16} strokeWidth={2} />
      {feedback ?? "Compartilhar"}
    </button>
  );
}
