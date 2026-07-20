// Helper client-side do Meta Pixel. O código base do pixel (fbevents.js + PageView) já é
// injetado no app/layout.tsx quando `config_rastreio.meta_pixel_id` está setado; aqui só
// disparamos os eventos de FUNIL por cima dele.
//
// Todos os disparos são NO-OP SEGURO quando o pixel não carregou (id não configurado,
// adblock, SSR) — nunca lançam. Cada evento leva um `event_id` pra permitir dedup com o
// Conversions API (server-side) no futuro: cliente e servidor mandando o MESMO event_id
// fazem a Meta contar uma vez só.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Gera um id de evento (para dedup cliente↔servidor). */
export function novoEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}

/**
 * Dispara um evento padrão do Meta Pixel no cliente. `evento` é um Standard Event
 * ("ViewContent", "InitiateCheckout", "Purchase", ...). Retorna o `event_id` usado
 * (útil pra espelhar o mesmo evento no CAPI). No-op seguro fora do navegador / sem fbq.
 */
export function pixelTrack(evento: string, dados: Record<string, unknown> = {}, eventId?: string): string {
  const id = eventId ?? novoEventId();
  if (typeof window === "undefined" || typeof window.fbq !== "function") return id;
  window.fbq("track", evento, dados, { eventID: id });
  return id;
}
