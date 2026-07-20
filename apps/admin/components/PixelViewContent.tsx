"use client";

import { useEffect } from "react";
import { pixelTrack } from "@/lib/metaPixel";

/**
 * Dispara `ViewContent` do Meta Pixel ao montar — o evento de "viu a oferta". Usado nas
 * landings (/planos, /planos-slim) pra ter um sinal de meio-de-funil separado do PageView
 * (que sai em qualquer página). Renderiza nada. No-op seguro se o pixel não carregou.
 */
export function PixelViewContent({ nome }: { nome?: string }) {
  useEffect(() => {
    pixelTrack("ViewContent", nome ? { content_name: nome } : {});
  }, [nome]);
  return null;
}
