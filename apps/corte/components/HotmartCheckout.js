"use client";

import { useEffect, useMemo } from "react";

// Checkout HOTMART como WIDGET (popup/overlay) — la compradora paga en MXN/OXXO/
// tarjeta SIN salir del /es. Mecánica estable de Hotmart: cargamos el CSS+JS del
// widget y renderizamos NUESTRA CTA como <a class="hotmart-fb-checkout">. El script
// intercepta el clic y abre el checkout en overlay (checkoutMode=2).
//
// Atribución Meta (igual que el checkout nativo BR): capturamos _fbp/_fbc/fbclid/utm
// en NUESTRO dominio, generamos una referencia propia (sck), guardamos el tracking
// por esa referencia (/api/track) y la mandamos como `sck` en la URL. El webhook
// /api/hotmart lee el sck → recupera el tracking → enriquece el Purchase del CAPI (MX).
//
// Config (Vercel env): NEXT_PUBLIC_HOTMART_CHECKOUT_URL = URL de pago de la oferta
//   (ej.: https://pay.hotmart.com/XXXXXXXX). Sin ella → botón "Próximamente".

const CSS_URL = "https://static.hotmart.com/css/hotmart-fb.min.css";
const JS_URL = "https://static.hotmart.com/checkout/widget.min.js";
const BASE = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL || "";

function capturarTracking() {
  const t = {};
  try {
    const cookie = (n) => (document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")) || [])[1] || "";
    t.fbp = cookie("_fbp");
    t.fbc = cookie("_fbc");
    const q = new URLSearchParams(window.location.search);
    t.fbclid = q.get("fbclid") || "";
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) t[k] = q.get(k) || "";
  } catch {}
  return t;
}

export default function HotmartCheckout({ children, className = "", valor, currency = "MXN", metadata, onClick }) {
  // Referencia propia estable por render de este componente (sck).
  const ref = useMemo(() => {
    try { return "dvmx_" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)); }
    catch { return "dvmx_" + Math.random().toString(36).slice(2); }
  }, []);

  // Carga el widget del Hotmart una sola vez.
  useEffect(() => {
    if (!BASE || typeof document === "undefined") return;
    if (!document.getElementById("hotmart-fb-css")) {
      const l = document.createElement("link");
      l.id = "hotmart-fb-css"; l.rel = "stylesheet"; l.href = CSS_URL;
      document.head.appendChild(l);
    }
    if (!document.getElementById("hotmart-fb-js")) {
      const s = document.createElement("script");
      s.id = "hotmart-fb-js"; s.src = JS_URL; s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  // Guarda el tracking por la referencia (para el webhook enriquecer el CAPI).
  useEffect(() => {
    if (!BASE) return;
    try {
      const t = capturarTracking();
      fetch("/api/track", {
        method: "POST", keepalive: true, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref, valor, currency, ...t, ...(metadata || {}) }),
      });
    } catch {}
  }, [ref]);

  if (!BASE) {
    return <span className={className} style={{ opacity: 0.6 }} aria-disabled>Próximamente</span>;
  }

  // Passa utm/ src pro painel do Hotmart también (además del sck con nuestra ref).
  let utm = "";
  try {
    const q = new URLSearchParams(window.location.search);
    const src = q.get("utm_campaign") || q.get("utm_source") || "";
    if (src) utm = "&src=" + encodeURIComponent(src);
  } catch {}
  const sep = BASE.includes("?") ? "&" : "?";
  const url = `${BASE}${sep}checkoutMode=2&sck=${encodeURIComponent(ref)}${utm}`;

  return (
    <a
      href={url}
      className={"hotmart-fb-checkout " + className}
      onClick={() => { try { onClick && onClick(); } catch {} }}
    >
      {children}
    </a>
  );
}
