"use client";
import { useEffect } from "react";

export default function RegistrarSW() {
  useEffect(() => {
    // Só em produção — em dev o cache-first de estáticos brigaria com o HMR.
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
