"use client";

import { ShieldCheck } from "lucide-react";

export function ModalConfirmarGoogle({
  aberto,
  enviando,
  onCancelar,
  onConfirmar,
}: {
  aberto: boolean;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  if (!aberto) return null;

  return (
    <div className="popup-google-overlay" onClick={onCancelar}>
      <div className="popup-google" onClick={(evento) => evento.stopPropagation()}>
        <button type="button" className="popup-google-fechar" onClick={onCancelar} aria-label="Fechar">
          ×
        </button>
        <ShieldCheck size={32} strokeWidth={2} className="popup-google-icone" />
        <p className="popup-google-texto">
          Você verá um domínio técnico do nosso provedor de autenticação — é normal e seguro.
        </p>
        <button type="button" className="popup-google-continuar" onClick={onConfirmar} disabled={enviando}>
          {enviando ? "Redirecionando…" : "Continuar Login Google"}
        </button>
      </div>
    </div>
  );
}
