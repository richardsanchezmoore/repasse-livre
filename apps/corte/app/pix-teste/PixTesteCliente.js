"use client";

import { useState } from "react";
import PixCheckout from "@/components/PixCheckout";

// Página de teste isolada do funil que vai ao ar — valida o checkout nativo
// (PIX + Cartão) ponta a ponta. Preço e parcelas vêm da Cakto (via /api/oferta),
// sem nada chumbado: mude o valor na Cakto e aqui reflete sozinho.
export default function PixTesteCliente() {
  const [aberto, setAberto] = useState(false);
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f0f13", padding: 24 }}>
      {aberto ? (
        <PixCheckout metadata={{ origem: "pix-teste" }} onClose={() => setAberto(false)} />
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
