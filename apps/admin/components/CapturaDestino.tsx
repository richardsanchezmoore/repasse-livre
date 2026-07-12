"use client";

import { useEffect } from "react";

const CHAVE = "rl_destino_pos_compra";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guarda a "origem" (?de={oportunidadeId}) no localStorage quando o usuário chega
 * na /planos vindo de um anúncio fechado (overlay/BlocoAcessoBloqueado/Copiloto).
 * Sobrevive ao vai-e-volta do checkout da Cakto (mesmo domínio) → a /bem-vindo lê
 * e devolve o usuário pro carro que ele queria. Sem `de` = veio de campanha.
 */
export function CapturaDestino() {
  useEffect(() => {
    const de = new URLSearchParams(window.location.search).get("de");
    if (de && UUID.test(de)) localStorage.setItem(CHAVE, de);
  }, []);
  return null;
}
