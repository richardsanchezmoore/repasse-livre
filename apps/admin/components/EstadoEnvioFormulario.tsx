"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function EstadoEnvioFormulario() {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <div className="formulario-overlay-envio" role="status" aria-live="polite">
      <Loader2 size={32} strokeWidth={2} className="formulario-overlay-spinner" />
      <p>Enviando sua oportunidade…</p>
      <span className="formulario-overlay-aviso">Não saia da página nem clique novamente.</span>
    </div>
  );
}
