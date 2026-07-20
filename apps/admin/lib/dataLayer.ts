// Camada de eventos via GTM. O container GTM já é injetado no app/layout.tsx quando
// `config_rastreio.gtm_id` está setado; o código NÃO dispara pixels direto — só empurra
// eventos semânticos pro dataLayer, e o GTM (na UI, sem deploy) mapeia cada um pras tags
// (Meta Pixel, GA4, etc.). Assim adicionar/trocar pixel é config, não código.
//
// Cada push já leva um `event_id` — o GTM pode repassá-lo como Event ID do Pixel, o que
// permite dedup com o Conversions API (server-side) se um dia espelharmos o evento lá.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function novoEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}

/**
 * Empurra um evento semântico pro dataLayer do GTM. No-op seguro no SSR. Nomes de evento
 * usados hoje: "ver_oferta" (viu a landing) e "iniciar_checkout" (clicou pra assinar).
 */
export function pushDL(evento: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: evento, event_id: novoEventId(), ...params });
}
