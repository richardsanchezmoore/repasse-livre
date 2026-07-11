"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Galeria "Veja por dentro" da /planos — fila de celulares com rolagem horizontal
 * + scroll-snap, agora com AFORDÂNCIA: setas (desktop), bolinhas que seguem o
 * scroll e degradê nas bordas indicando que continua. Só a faixa rola; a página
 * não. Os prints vêm do server (page.tsx) — aqui só a interação.
 */
export function GaleriaPrints({ prints }: { prints: { src: string; alt: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [podeEsq, setPodeEsq] = useState(false);
  const [podeDir, setPodeDir] = useState(true);

  const atualizar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    setPodeEsq(scrollLeft > 8);
    setPodeDir(scrollLeft + clientWidth < scrollWidth - 8);
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".vendas-fone--mini"));
    const centro = scrollLeft + clientWidth / 2;
    let idx = 0;
    let melhor = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro);
      if (d < melhor) {
        melhor = d;
        idx = i;
      }
    });
    setAtivo(idx);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      el.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, [atualizar]);

  function irPara(i: number) {
    const el = ref.current;
    const card = el?.querySelectorAll<HTMLElement>(".vendas-fone--mini")[i];
    if (el && card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
  }
  function passo(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".vendas-fone--mini");
    const larg = card ? card.offsetWidth + 16 : 200;
    el.scrollBy({ left: dir * larg, behavior: "smooth" });
  }

  return (
    <div className="vendas-galeria-wrap">
      <div className="vendas-galeria-palco" data-esq={podeEsq} data-dir={podeDir}>
        <button
          type="button"
          className="vendas-galeria-seta vendas-galeria-seta--esq"
          data-vis={podeEsq}
          onClick={() => passo(-1)}
          aria-label="Ver anteriores"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>

        <div className="vendas-galeria" ref={ref}>
          {prints.map((g) => (
            <div key={g.src} className="vendas-fone vendas-fone--mini" aria-hidden="true">
              <div className="vendas-fone-notch" />
              <div className="vendas-fone-tela">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.alt} />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="vendas-galeria-seta vendas-galeria-seta--dir"
          data-vis={podeDir}
          onClick={() => passo(1)}
          aria-label="Ver próximos"
        >
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      </div>

      <div className="vendas-galeria-dots">
        {prints.map((g, i) => (
          <button
            key={g.src}
            type="button"
            className="vendas-galeria-dot"
            data-ativo={i === ativo}
            onClick={() => irPara(i)}
            aria-label={`Ir para a tela ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
