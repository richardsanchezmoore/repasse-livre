"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gem, X, ArrowRight } from "lucide-react";

/**
 * Ponte 2 — barra sticky que aparece quando o visitante passa de ~50% da página
 * (usa o sinal de scroll, mesma ideia do scroll_depth). Só engatilha pra quem ENGAJOU,
 * é mobile-friendly (2/3 do tráfego) e dispensável (X). Renderiza só pra não-assinante
 * (gate no chamador). Complementa o box da PonteAssinatura sem interromper a leitura.
 */
export function BarraPonteScroll() {
  const [visivel, setVisivel] = useState(false);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? window.scrollY / total : 0;
      // 15% (não 50%): anúncios curtos morrem antes dos 50%, e a barra é suave/dispensável.
      setVisivel(pct > 0.15);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  if (fechado || !visivel) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
        padding: "0 12px 12px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "min(680px, 100%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "linear-gradient(160deg,#0E2A1A,#081410)",
          border: "1px solid rgba(0,200,69,.3)",
          borderRadius: 14,
          padding: "12px 14px",
          boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)",
          color: "#fff",
        }}
      >
        <Gem size={18} fill="#00c845" strokeWidth={0} style={{ flex: "none" }} />
        <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.35, color: "#d6e2ec" }}>
          <b style={{ color: "#fff" }}>Dezenas de carros abaixo da FIPE</b> todo dia — no seu estado, com alerta na hora.
        </span>
        <Link
          href="/planos-slim"
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(180deg,#00d24e,#00a038)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            padding: "9px 15px",
            borderRadius: 999,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Ver todas <ArrowRight size={15} strokeWidth={2.4} />
        </Link>
        <button
          type="button"
          onClick={() => setFechado(true)}
          aria-label="Fechar"
          style={{ flex: "none", background: "none", border: "none", color: "#6f8598", cursor: "pointer", padding: 4, lineHeight: 0 }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
