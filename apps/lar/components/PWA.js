"use client";
import { useEffect } from "react";

/** Registra o service worker (só em produção — em dev ele brigaria com o HMR).
 *  Dá a "cara de app instalado": abre instantâneo e funciona offline. */
export default function PWA() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(base + "/sw.js", { scope: base + "/" }).catch(() => {});
  }, []);
  return null;
}
