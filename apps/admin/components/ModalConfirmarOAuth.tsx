"use client";

import { ShieldCheck } from "lucide-react";

/**
 * Aviso antes de redirecionar pro provedor OAuth (Google/Facebook): o usuário
 * vê o domínio técnico do Supabase na tela de consentimento, o que assusta —
 * este modal explica que é normal. Genérico por provedor (só o rótulo muda).
 * Ver project_repasse_livre_aviso_dominio_google_login.
 */
export function ModalConfirmarOAuth({
  aberto,
  enviando,
  provedor,
  onCancelar,
  onConfirmar,
}: {
  aberto: boolean;
  enviando: boolean;
  provedor: string;
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
          {enviando ? "Redirecionando…" : `Continuar Login ${provedor}`}
        </button>
      </div>
    </div>
  );
}
