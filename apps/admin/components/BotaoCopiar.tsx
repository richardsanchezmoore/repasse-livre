"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Botão genérico de "copiar pro clipboard" com feedback (ícone Copiar → Check
 * "Copiado!"). Usado na página de criativos pra copiar legenda/título/URL
 * separadamente — fluxo mobile "abro, copio, colo no Metricool".
 */
export function BotaoCopiar({
  texto,
  rotulo = "Copiar",
  compacto = false,
}: {
  texto: string;
  rotulo?: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Clipboard bloqueado (contexto inseguro/permissão) — não trava a UI.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: copiado ? "#DCFCE7" : "#fff",
        color: copiado ? "#15803D" : "#0F1B2D",
        border: `1px solid ${copiado ? "#86EFAC" : "#D5DCE4"}`,
        fontWeight: 700,
        fontSize: compacto ? 12 : 13,
        padding: compacto ? "6px 10px" : "8px 12px",
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background .15s, border-color .15s",
      }}
    >
      {copiado ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
      {copiado ? "Copiado!" : rotulo}
    </button>
  );
}
