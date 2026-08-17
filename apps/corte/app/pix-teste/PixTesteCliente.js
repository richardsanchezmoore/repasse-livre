"use client";

import { useState } from "react";
import PixCheckout from "@/components/PixCheckout";

// Página de teste isolada do funil que vai ao ar — valida o checkout PIX nativo
// ponta a ponta (gerar cobrança → QR → pagamento real → /bem-vinda).
export default function PixTesteCliente() {
  const [aberto, setAberto] = useState(false);
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f0f13", padding: 24 }}>
      {aberto ? (
        <PixCheckout valor="R$ 5,00" metadata={{ origem: "pix-teste" }} onClose={() => setAberto(false)} />
      ) : (
        <button
          onClick={() => setAberto(true)}
          style={{ background: "linear-gradient(180deg,#cba85b,#b0873f)", color: "#2a0e16", border: "1px solid #f6e7c9", borderRadius: 12, padding: "16px 26px", fontSize: 17, fontWeight: 800, cursor: "pointer" }}
        >
          Abrir checkout de teste · R$ 5,00
        </button>
      )}
    </main>
  );
}
