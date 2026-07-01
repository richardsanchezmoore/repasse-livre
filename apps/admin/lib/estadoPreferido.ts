/**
 * Persistência da escolha manual de estado (UF) da vitrine pública.
 *
 * O filtro de estado vem pré-selecionado por geolocalização de IP na PRIMEIRA
 * visita (ver obterEstadoDetectado em geolocalizacao.ts). Mas a escolha só
 * vivia no param `estado` da URL — ao clicar num anúncio e voltar (o "Voltar"
 * é <Link href="/"> sem param), ou em qualquer navegação que perca o param,
 * a página recaía na detecção por IP e sobrescrevia a escolha do usuário.
 *
 * Este cookie guarda a última escolha manual pra ela sobreviver à navegação e
 * ter PRIORIDADE sobre o GEO. Precedência em app/page.tsx:
 *   param `estado` na URL  >  cookie `rl_estado`  >  GEO (só 1ª visita)
 *
 * Módulo client-safe de propósito (zero imports server-only) — é lido no
 * server por geolocalizacao.ts (só a constante) e escrito no client pelos
 * seletores de estado. Ver [[project_repasse_livre_client_safe_split]].
 */
export const COOKIE_ESTADO_PREFERIDO = "rl_estado";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * Salva a UF escolhida (ou o sentinela "BR" pra "Brasil" explícito) no cookie.
 * Só roda no client (usa document.cookie); no-op no server.
 */
export function salvarEstadoPreferido(estado: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_ESTADO_PREFERIDO}=${estado}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; SameSite=Lax`;
}
