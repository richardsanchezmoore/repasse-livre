import { cookies, headers } from "next/headers";

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
