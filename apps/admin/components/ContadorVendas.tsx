"use client";

import { useEffect, useState } from "react";

// Contador da landing "Premium Escuro" — ISOLADO num componente-folha de propósito:
// ele re-renderiza a cada segundo, mas o resto da PaginaVendas NÃO (senão o React
// resetaria o count-up do KPI e as animações). Honesto: janela por visitante em
// localStorage, não reseta a cada F5 (ver [[project_repasse_livre_premium_monetizacao]]).
const CHAVE = "rl_oferta_expira_em";
const JANELA_MS = 57 * 60 * 1000;
const TIT = "var(--fv-titulo), Poppins, sans-serif";
const CORPO = "var(--fv-corpo), Manrope, sans-serif";

function usarRelogio() {
  const [rel, setRel] = useState({ hh: "--", mm: "--", ss: "--" });
  useEffect(() => {
    const agora = Date.now();
    let fim = Number(localStorage.getItem(CHAVE));
    if (!Number.isFinite(fim) || fim <= agora || fim - agora > 24 * 3600 * 1000) {
      fim = agora + JANELA_MS;
      try {
        localStorage.setItem(CHAVE, String(fim));
      } catch {
        /* aba anônima estrita */
      }
    }
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const d = Math.max(0, fim - Date.now());
      const t = Math.floor(d / 1000);
      setRel({ hh: p(Math.floor(t / 3600)), mm: p(Math.floor((t % 3600) / 60)), ss: p(t % 60) });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return rel;
}

/** Três caixas HORAS:MIN:SEG (barra de urgência). */
export function ContadorRelogio() {
  const r = usarRelogio();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {[
        { v: r.hh, rot: "HORAS" },
        { v: r.mm, rot: "MIN" },
        { v: r.ss, rot: "SEG" },
      ].map((b, i) => (
        <div key={b.rot} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {i > 0 && <span style={{ font: `800 14px ${TIT}`, color: "#35D07F" }}>:</span>}
          <div style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 8, padding: "6px 9px", textAlign: "center", minWidth: 38 }}>
            <div style={{ font: `800 15px ${TIT}` }}>{b.v}</div>
            <div style={{ font: `600 7px ${CORPO}`, letterSpacing: ".14em", color: "#7f93a3" }}>{b.rot}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** HH:MM:SS inline (pills "expira em"). */
export function ContadorTexto() {
  const r = usarRelogio();
  return (
    <b style={{ fontVariantNumeric: "tabular-nums" }}>
      {r.hh}:{r.mm}:{r.ss}
    </b>
  );
}
