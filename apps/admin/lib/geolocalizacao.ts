import { cookies, headers } from "next/headers";
import { UFS } from "./mascaras";
import { COOKIE_ESTADO_PREFERIDO } from "./estadoPreferido";

export interface CoordsUsuario {
  lat: number;
  lng: number;
}

const COOKIE_GEO = "rl_geo";

/**
 * Resolve a localização aproximada do usuário pra "ordenar por
 * proximidade" na vitrine pública. Prioridade:
 * 1. Cookie `rl_geo` — geolocalização precisa do navegador, salva pelo
 *    componente client DetectorLocalizacao quando o usuário concede a
 *    permissão.
 * 2. Cabeçalho de geolocalização por IP da própria Vercel
 *    (`x-vercel-ip-latitude`/`-longitude`) — automático em produção, sem
 *    pop-up de permissão; ausente em `next dev` local.
 * Sem nenhum dos dois, retorna null e a UI simplesmente não oferece a
 * ordenação por proximidade.
 */
export async function obterCoordsUsuario(): Promise<CoordsUsuario | null> {
  const cookieStore = await cookies();
  const cookieGeo = cookieStore.get(COOKIE_GEO)?.value;
  if (cookieGeo) {
    const [latTexto, lngTexto] = cookieGeo.split(",");
    const lat = Number(latTexto);
    const lng = Number(lngTexto);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  const headerStore = await headers();
  const latHeader = headerStore.get("x-vercel-ip-latitude");
  const lngHeader = headerStore.get("x-vercel-ip-longitude");
  if (latHeader && lngHeader) {
    const lat = Number(latHeader);
    const lng = Number(lngHeader);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Estado (UF) detectado por IP via cabeçalho de geolocalização da Vercel
 * (`x-vercel-ip-country-region` — subdivisão ISO 3166-2, ex.: "RS" para o
 * Brasil). Usado pra pré-selecionar o filtro de estado na vitrine pública
 * — visível e limpável pelo próprio seletor de estado (diferente da
 * antiga "ordenar por proximidade" silenciosa, que mudava a ordem dos
 * resultados sem nenhum indicador visível e confundia quem queria ver o
 * Brasil inteiro). Ausente em `next dev` local (sem Vercel) — UI cai pro
 * comportamento padrão de sempre (sem estado pré-selecionado).
 */
export async function obterEstadoDetectado(): Promise<string | null> {
  const headerStore = await headers();
  const regiao = headerStore.get("x-vercel-ip-country-region");
  return regiao && UFS.includes(regiao) ? regiao : null;
}

/**
 * Última escolha manual de estado salva no cookie `rl_estado` (ver
 * lib/estadoPreferido.ts). Tem prioridade sobre o GEO: a detecção por IP só
 * define o estado na 1ª visita (sem cookie); depois a escolha do usuário
 * manda e sobrevive à navegação. Retorna "BR" (Brasil explícito), uma UF
 * válida, ou null (sem preferência salva / cookie inválido).
 */
export async function obterEstadoPreferido(): Promise<string | null> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(COOKIE_ESTADO_PREFERIDO)?.value;
  if (!valor) return null;
  if (valor === "BR") return "BR";
  return UFS.includes(valor) ? valor : null;
}
