"use client";

import { useEffect } from "react";
import { registrarEvento } from "@/lib/eventosAnalytics";

/**
 * Dispara "visualizacao_oportunidade" uma vez por carregamento da página
 * individual. Denormaliza veiculo/estado no payload — assim a "procura por
 * modelo/região" sobrevive mesmo se o anúncio for apagado (opportunity_id é
 * 'on delete set null'). Dedup real (1 por visitante/dia) é na consulta, via
 * visitor_id que o registrarEvento anexa.
 */
export function RegistradorVisualizacao({
  opportunityId,
  veiculo,
  estado,
}: {
  opportunityId: string;
  veiculo?: string | null;
  estado?: string | null;
}) {
  useEffect(() => {
    registrarEvento("visualizacao_oportunidade", { veiculo: veiculo ?? null, estado: estado ?? null }, opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  return null;
}
