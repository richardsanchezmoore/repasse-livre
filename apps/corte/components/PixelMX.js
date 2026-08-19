"use client";

import { useEffect } from "react";

// Pixel Meta de la cuenta MÉXICO (separado del BR, para optimización por valor limpia
// en MXN). El layout raíz NO inicializa el pixel BR en rutas /es (ver app/layout.js),
// así que aquí inyectamos el pixel MX. Sin la env → no inicializa ningún pixel (no
// contamina nada). Cuando tengas el pixel MX, define NEXT_PUBLIC_META_PIXEL_ID_MX.

const PIXEL_MX = process.env.NEXT_PUBLIC_META_PIXEL_ID_MX || "";

export default function PixelMX({ value, currency = "MXN" }) {
  useEffect(() => {
    try { document.documentElement.lang = "es-MX"; } catch {}
    if (!PIXEL_MX || typeof window === "undefined") return;
    try {
      // base code (idéntico al de Meta), solo si fbq aún no existe
      if (!window.fbq) {
        /* eslint-disable */
        !(function (f, b, e, v, n, t, s) {
          if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
          t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
        })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
        /* eslint-enable */
      }
      if (!window.__dvmx_pixel) {
        window.fbq("init", PIXEL_MX);
        window.__dvmx_pixel = true;
      }
      window.fbq("track", "PageView");
    } catch {}
  }, []);

  return null;
}
