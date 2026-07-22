"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Número da faixa "Ao vivo · Nossos números" (/planos-slim) com count-up: anima
 * 0 → valor final quando entra na tela (IntersectionObserver), reformatando em
 * pt-BR a cada frame. Dá a sensação de "sistema vivo" sem trocar a fonte da verdade
 * (o valor final chega pronto do server em `valor`, ex. "56.773" ou "R$ 33,1").
 *
 * SSR renderiza o valor FINAL (evita mismatch de hidratação e mostra número real
 * sem JS); só no cliente ele zera e conta pra cima — como a faixa fica no meio da
 * página, o reset acontece antes de entrar em vista, então não há flash visível.
 * Respeita prefers-reduced-motion (fica no valor final, sem animar).
 */

/** Quebra "R$ 33,1" em prefixo ("R$ "), alvo (33.1) e casas decimais (1). */
function analisar(valor: string): { prefixo: string; alvo: number; casas: number } {
  const primeiroDigito = valor.search(/\d/);
  if (primeiroDigito < 0) return { prefixo: valor, alvo: 0, casas: 0 };
  const prefixo = valor.slice(0, primeiroDigito);
  const nucleo = valor.slice(primeiroDigito); // "56.773" | "33,1"
  const casas = (nucleo.split(",")[1] ?? "").length;
  const alvo = parseFloat(nucleo.replace(/\./g, "").replace(",", "."));
  return { prefixo, alvo: Number.isFinite(alvo) ? alvo : 0, casas };
}

export function ContadorNumeroAoVivo({
  valor,
  sufixo,
  style,
  sufixoStyle,
}: {
  valor: string;
  sufixo?: string;
  style?: CSSProperties;
  sufixoStyle?: CSSProperties;
}) {
  const { prefixo, alvo, casas } = analisar(valor);
  const [atual, setAtual] = useState(alvo); // SSR/1º render = valor final (sem mismatch)
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    setAtual(0); // client-only: zera pra contar pra cima quando a faixa aparecer
    let raf = 0;
    let animou = false;
    const DUR = 1000;

    const animar = () => {
      if (animou) return;
      animou = true;
      let t0: number | null = null;
      const passo = (t: number) => {
        if (t0 === null) t0 = t;
        const p = Math.min((t - t0) / DUR, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic — rápido e suave no fim
        setAtual(alvo * eased);
        if (p < 1) raf = requestAnimationFrame(passo);
        else setAtual(alvo);
      };
      raf = requestAnimationFrame(passo);
    };

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            animar();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [alvo]);

  const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

  return (
    <div ref={ref} style={style}>
      {prefixo}
      {fmt.format(atual)}
      {sufixo && <span style={sufixoStyle}>{sufixo}</span>}
    </div>
  );
}
