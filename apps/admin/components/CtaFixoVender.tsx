"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";

/**
 * CTA fixo no rodapé — só MOBILE (escondido ≥641px via CSS no <style> da /vender).
 * Surge depois de 5% de scroll (efeito surpresa) e some quando o formulário
 * (#anunciar) está aberto, pra não cobrir os campos. No clique, abre o accordion
 * e rola até ele.
 */
export function CtaFixoVender() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const det = document.getElementById("anunciar") as HTMLDetailsElement | null;
      if (det?.open) {
        setVisivel(false);
        return;
      }
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setVisivel(h > 0 && window.scrollY / h > 0.05);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function abrirForm() {
    const det = document.getElementById("anunciar") as HTMLDetailsElement | null;
    if (!det) return;
    det.open = true;
    setVisivel(false);
    // Rola pro TOPO do form (não pro centro) — assim mostra o parágrafo logo
    // abaixo do CTA e os primeiros campos, não o meio. rAF pra esperar o
    // accordion expandir antes de medir a posição.
    requestAnimationFrame(() => {
      const y = det.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  }

  return (
    <div className="cta-fixo-vender" data-visivel={visivel} aria-hidden={!visivel}>
      <button type="button" onClick={abrirForm} className="cta-fixo-btn">
        <Car size={19} strokeWidth={2.4} />
        Qual carro você quer vender?
      </button>
    </div>
  );
}
