"use client";

import { formatarPublicacaoRelativa } from "@/lib/formatadores";
import { useTextos } from "@/lib/useIdioma";

/**
 * "Publicado el 09/10, 22:00" — a data no idioma da página.
 *
 * ⚠️ Mesmo motivo do <Texto />: `PaginaOportunidade` é server component e não
 * pode usar hook. Aqui a menor unidade de cliente possível carrega os rótulos
 * para dentro do formatador, que é puro e não sabe de idioma.
 */
export function DataPublicacao({ iso }: { iso: string | null | undefined }) {
  const tx = useTextos();
  if (!iso) return null;
  return <>{formatarPublicacaoRelativa(iso, { anunciadoEm: tx("anunciadoEmRotulo"), hojeAs: tx("hojeAs"), hoje: tx("hoje") })}</>;
}
