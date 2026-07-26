"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { excluirAnuncioProprio } from "@/app/meus-anuncios/actions";

/** Botão de excluir anúncio do vendedor — com confirmação antes de apagar. */
export function BotaoExcluirAnuncio({ anuncioId, veiculo }: { anuncioId: string; veiculo: string }) {
  const router = useRouter();
  const [excluindo, iniciar] = useTransition();
  const [erro, setErro] = useState(false);

  function aoClicar() {
    if (!window.confirm(`Excluir o anúncio "${veiculo}"? Essa ação não pode ser desfeita.`)) return;
    setErro(false);
    iniciar(async () => {
      const r = await excluirAnuncioProprio(anuncioId);
      if (r.ok) router.refresh();
      else setErro(true);
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={excluindo}
      title={erro ? "Falhou — tente de novo" : "Excluir anúncio"}
      style={{
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 9,
        border: "1px solid #f0d0d0",
        background: "#fff",
        color: erro ? "#b91c1c" : "#d9463e",
        cursor: excluindo ? "default" : "pointer",
      }}
    >
      {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2} />}
    </button>
  );
}
