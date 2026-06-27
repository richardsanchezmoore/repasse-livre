"use client";

import { useEffect } from "react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/** Dispara um evento "visualizacao_oportunidade" uma vez por carregamento da página individual. */
export function RegistradorVisualizacao({ opportunityId }: { opportunityId: string }) {
  useEffect(() => {
    registrarEvento("visualizacao_oportunidade", {}, opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  return null;
}
