"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

/**
 * Contador da oferta por tempo limitado — urgência HONESTA. A janela começa a
 * contar QUANDO o visitante chega (guardada no localStorage) e NÃO reseta a cada
 * F5 — evita o "timer falso" que resetaria pra sempre e arranharia a credibilidade
 * da marca. Passadas as horas, o timer some (não finge outra contagem); a oferta
 * segue exibida como texto fixo, sem número decrescente fake.
 *
 * variante:
 *  - "barra": faixa fina sticky no topo da página.
 *  - "inline": bloco compacto pra colar perto do preço no hero.
 */
const CHAVE = "rl_oferta_expira_em";
const JANELA_MS = 3 * 60 * 60 * 1000; // 3h por visitante

function doisDigitos(n: number) {
  return String(n).padStart(2, "0");
}

export function ContadorOferta({
  variante = "inline",
  descontoPct = null,
}: {
  variante?: "barra" | "inline";
  /** % OFF exibido na barra (ex.: 60). null = mostra só "Oferta por tempo limitado". */
  descontoPct?: number | null;
}) {
  const [restanteMs, setRestanteMs] = useState<number | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let expiraEm = Number(localStorage.getItem(CHAVE));
    // Primeira visita (ou registro inválido) → abre a janela agora.
    if (!Number.isFinite(expiraEm) || expiraEm <= 0) {
      expiraEm = Date.now() + JANELA_MS;
      localStorage.setItem(CHAVE, String(expiraEm));
    }
    setPronto(true);

    const tick = () => setRestanteMs(Math.max(0, expiraEm - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Antes de montar no cliente não renderiza (evita mismatch de hidratação).
  if (!pronto || restanteMs === null) {
    return variante === "barra" ? <div className="oferta-barra oferta-barra--vazia" /> : null;
  }

  const expirou = restanteMs <= 0;
  const totalSeg = Math.floor(restanteMs / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;

  if (variante === "barra") {
    return (
      <div className="oferta-barra">
        <div className="oferta-barra-selo">
          {descontoPct ? (
            <>
              <strong>
                HOJE: <em>{descontoPct}% OFF</em>
              </strong>
              <span>Oferta por tempo limitado</span>
            </>
          ) : (
            <strong>Oferta por tempo limitado</strong>
          )}
        </div>
        {!expirou && (
          <div className="oferta-relogio">
            <div className="oferta-bloco">
              <b>{doisDigitos(h)}</b>
              <span>HORAS</span>
            </div>
            <i>:</i>
            <div className="oferta-bloco">
              <b>{doisDigitos(m)}</b>
              <span>MINUTOS</span>
            </div>
            <i>:</i>
            <div className="oferta-bloco">
              <b>{doisDigitos(s)}</b>
              <span>SEGUNDOS</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // inline (perto do preço)
  if (expirou) {
    return (
      <p className="oferta-inline oferta-inline--fim">
        <Clock size={14} strokeWidth={2.4} /> Oferta por tempo limitado
      </p>
    );
  }
  return (
    <div className="oferta-inline">
      <Clock size={15} strokeWidth={2.4} />
      <span>Sua oferta expira em</span>
      <div className="oferta-inline-relogio">
        <span>{doisDigitos(h)}</span>:<span>{doisDigitos(m)}</span>:<span>{doisDigitos(s)}</span>
      </div>
    </div>
  );
}
