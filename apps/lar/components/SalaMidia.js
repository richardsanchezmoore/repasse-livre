"use client";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Exibe a mídia da Sala guardando no APARELHO (Cache API): uma vez baixada, fica no
 *  celular mesmo depois de sumir do servidor. Se nunca baixou e já expirou → placeholder. */
export default function SalaMidia({ path }) {
  const [src, setSrc] = useState(null);
  const [estado, setEstado] = useState("carregando"); // carregando | ok | indisponivel

  useEffect(() => {
    let vivo = true; let objectUrl;
    (async () => {
      const alvo = BASE + "/api/sala/midia?path=" + encodeURIComponent(path);
      try {
        let resp = null;
        try { const cache = await caches.open("sala-midia"); resp = await cache.match(alvo); } catch {}
        if (!resp) {
          const net = await fetch(alvo);
          if (net.ok) { try { const cache = await caches.open("sala-midia"); await cache.put(alvo, net.clone()); } catch {} resp = net; }
        }
        if (!resp || !resp.ok) { if (vivo) setEstado("indisponivel"); return; }
        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (vivo) { setSrc(objectUrl); setEstado("ok"); }
      } catch { if (vivo) setEstado("indisponivel"); }
    })();
    return () => { vivo = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);

  if (estado === "indisponivel") return <div className="sala-midia-off">📷 Mídia não está mais disponível</div>;
  if (estado === "carregando") return <div className="sala-midia-load"><div className="spin" style={{ width: 20, height: 20, borderWidth: 2 }} /></div>;
  return <img className="sala-midia-img" src={src} alt="" loading="lazy" />;
}
