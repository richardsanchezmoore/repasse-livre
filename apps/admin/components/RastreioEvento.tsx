"use client";

import { useEffect } from "react";
import { pushDL } from "@/lib/dataLayer";

/**
 * Dispara um evento pro dataLayer (GTM) ao montar. Usado pra eventos de "página vista"
 * (ex.: `ver_oferta` nas landings). O GTM decide o que fazer com o evento. Renderiza nada.
 */
export function RastreioEvento({ evento, params }: { evento: string; params?: Record<string, unknown> }) {
  useEffect(() => {
    pushDL(evento, params);
    // Dispara uma vez ao montar (page-view). params é literal do chamador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
