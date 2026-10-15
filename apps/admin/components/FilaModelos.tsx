"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ═══ A FILEIRA QUE ROLA POR SETAS, NÃO POR BARRA ══════════════════════════
 *
 * ⚠️ Pedido do Gustavo (14/10/2026): *"o slider deve mostrar em setas e não
 * scrollbar que fica feio... as setas têm que ser perceptíveis mas discretas ao
 * mesmo tempo"*.
 *
 * ★★ AS SETAS SOMEM NAS PONTAS. Seta que continua visível no fim da lista e
 * não faz nada é pior que seta nenhuma — o visitante clica, nada acontece, e
 * ele deixa de confiar no resto dos controles. Por isso o componente observa a
 * própria rolagem e esconde cada seta quando chega na respectiva ponta.
 *
 * ⚠️ E a barra de rolagem continua existindo, só que INVISÍVEL: tirar o
 * `overflow` quebraria o gesto de arrastar no celular e a rolagem por trackpad,
 * que é como a maioria realmente navega uma fileira dessas. O que sai é o
 * desenho da barra, não a capacidade de rolar.
 *
 * ⚠️ `passive: true` no listener: é só leitura de posição, e sem isso o
 * navegador precisa esperar o handler antes de pintar cada quadro da rolagem.
 */
export function FilaModelos({ children }: { children: ReactNode }) {
  const fila = useRef<HTMLDivElement>(null);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  useEffect(() => {
    const el = fila.current;
    if (!el) return;

    const medir = () => {
      // ⚠️ A folga de 2px existe porque `scrollLeft` é fracionário em telas
      // com zoom ou densidade não inteira: sem ela a seta pisca no fim.
      setPodeVoltar(el.scrollLeft > 2);
      setPodeAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };

    medir();
    el.addEventListener("scroll", medir, { passive: true });
    // Largura da janela muda quantos cartões cabem — e, com isso, se ainda há
    // para onde avançar.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      ro.disconnect();
    };
  }, []);

  function rolar(direcao: 1 | -1) {
    const el = fila.current;
    if (!el) return;
    // ★ Rola ~85% da largura visível, não a largura inteira: deixar um cartão
    // em comum entre uma tela e a seguinte é o que dá a sensação de
    // continuidade em vez de salto.
    el.scrollBy({ left: direcao * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="fila-modelos-caixa">
      {podeVoltar && (
        <button
          type="button"
          className="fila-modelos-seta fila-modelos-seta-esq"
          onClick={() => rolar(-1)}
          aria-label="Anterior"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
      )}

      <div className="explora-modelos-fila" ref={fila}>
        {children}
      </div>

      {podeAvancar && (
        <button
          type="button"
          className="fila-modelos-seta fila-modelos-seta-dir"
          onClick={() => rolar(1)}
          aria-label="Siguiente"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
