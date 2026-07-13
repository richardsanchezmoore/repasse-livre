"use client";

import { useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Slider de celulares da landing — setas + bolinhas + swipe (scroll-snap).
// Mantém o visual de moldura de celular do design, mas com affordance de slider
// (o design original só tinha scroll "cru", sem controles — o usuário não sabia
// que dava pra arrastar).
export function CarrosselVendas({
  imagens,
  largura = 190,
  aspecto = "350 / 708",
}: {
  imagens: { src: string; alt: string }[];
  largura?: number;
  aspecto?: string;
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  const irPara = (i: number) => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const idx = Math.max(0, Math.min(imagens.length - 1, i));
    const card = trilha.children[idx] as HTMLElement | undefined;
    if (!card) return;
    trilha.scrollTo({ left: card.offsetLeft - (trilha.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
    setAtivo(idx);
  };

  const aoRolar = () => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const centro = trilha.scrollLeft + trilha.clientWidth / 2;
    let melhor = 0;
    let menor = Infinity;
    Array.from(trilha.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const cc = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(cc - centro);
      if (d < menor) {
        menor = d;
        melhor = i;
      }
    });
    setAtivo(melhor);
  };

  const seta: CSSProperties = {
    position: "absolute",
    top: "calc(50% - 14px)",
    transform: "translateY(-50%)",
    zIndex: 4,
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1px solid #E4EAF0",
    background: "#fff",
    color: "#0F1B2D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 24px -10px rgba(15,27,45,.5)",
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={trilhaRef}
        onScroll={aoRolar}
        className="rlv-scroll"
        style={{ display: "flex", gap: 16, overflowX: "auto", padding: "6px 12px 16px", scrollSnapType: "x mandatory", justifyContent: imagens.length > 1 ? "flex-start" : "center" }}
      >
        {imagens.map((im, i) => (
          <div
            key={im.src + i}
            style={{ scrollSnapAlign: "center", flex: "none", width: largura, padding: 6, background: "linear-gradient(160deg,#22354f,#0F1B2D)", borderRadius: 28, boxShadow: "0 20px 40px -16px rgba(15,27,45,.5)" }}
          >
            <div style={{ borderRadius: 22, overflow: "hidden", background: "#EEF1F4", aspectRatio: aspecto }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt={im.alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
            </div>
          </div>
        ))}
      </div>

      {imagens.length > 1 && (
        <>
          <button type="button" aria-label="Anterior" onClick={() => irPara(ativo - 1)} disabled={ativo === 0} style={{ ...seta, left: -6, opacity: ativo === 0 ? 0.35 : 1 }}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>
          <button type="button" aria-label="Próximo" onClick={() => irPara(ativo + 1)} disabled={ativo === imagens.length - 1} style={{ ...seta, right: -6, opacity: ativo === imagens.length - 1 ? 0.35 : 1 }}>
            <ChevronRight size={20} strokeWidth={2.2} />
          </button>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 4 }}>
            {imagens.map((im, i) => (
              <button
                key={"dot" + im.src + i}
                type="button"
                aria-label={`Ir para ${i + 1}`}
                onClick={() => irPara(i)}
                style={{ width: i === ativo ? 22 : 8, height: 8, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, background: i === ativo ? "#16A34A" : "#cbd5e1", transition: "width .2s ease, background .2s ease" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
