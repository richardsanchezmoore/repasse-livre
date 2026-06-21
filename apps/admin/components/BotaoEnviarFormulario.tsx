"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function BotaoEnviarFormulario({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="formulario-enviar" disabled={desabilitado || pending}>
      {pending ? (
        <>
          <Loader2 size={18} strokeWidth={2} className="formulario-enviar-spinner" />
          Enviando…
        </>
      ) : (
        "Enviar oportunidade"
      )}
    </button>
  );
}
