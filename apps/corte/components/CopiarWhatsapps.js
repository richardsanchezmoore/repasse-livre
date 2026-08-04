"use client";
import { useState } from "react";

/** Botão que copia a lista de WhatsApp dos leads (um por linha, +55…) pra colar
 *  na hora de adicionar ao grupo manualmente. */
export default function CopiarWhatsapps({ numeros }) {
  const [ok, setOk] = useState(false);
  const lista = numeros || [];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(lista.join("\n"));
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {
      // fallback: seleção manual via prompt
      try { window.prompt("Copie os números (Ctrl+C):", lista.join("\n")); } catch { /* nada */ }
    }
  }

  if (!lista.length) return null;
  return (
    <button type="button" className={"chip" + (ok ? " on" : "")} onClick={copiar} disabled={ok}>
      {ok ? "✓ Copiado!" : `📋 Copiar todos os WhatsApp (${lista.length})`}
    </button>
  );
}
