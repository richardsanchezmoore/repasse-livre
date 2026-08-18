"use client";

import { useState } from "react";
import PixCheckout from "@/components/PixCheckout";

// Página de teste isolada do funil que vai ao ar — valida o checkout nativo
// (PIX + Cartão) ponta a ponta. A tabela de parcelas espelha a oferta 3fowby7.
const PARCELAS = [
  { n: 1, label: "1x de R$ 67,90" },
  { n: 2, label: "2x de R$ 36,90" },
  { n: 3, label: "3x de R$ 24,85" },
  { n: 4, label: "4x de R$ 19,00" },
];

export default function PixTesteCliente() {
  const [aberto, setAberto] = useState(false);
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f0f13", padding: 24 }}>
      {aberto ? (
        <PixCheckout valor="R$ 67,90" parcelas={PARCELAS} metadata={{ origem: "pix-teste" }} onClose={() => setAberto(false)} />
      ) : (
        <button
          onClick={() => setAberto(true)}
          style={{ background: "linear-gradient(180deg,#cba85b,#b0873f)", color: "#2a0e16", border: "1px solid #f6e7c9", borderRadius: 12, padding: "16px 26px", fontSize: 17, fontWeight: 800, cursor: "pointer" }}
        >
          Abrir checkout de teste
        </button>
      )}
    </main>
  );
}
