"use client";

import { useTextos } from "@/lib/useIdioma";
import type { ChaveTexto } from "@/lib/idioma";

/**
 * UMA PALAVRA TRADUZIDA, usável dentro de SERVER COMPONENT.
 *
 * ⚠️ O problema que resolve: `useTextos()` é hook, só vale em componente de
 * cliente. Mas metade dos rótulos do site mora em server component
 * (PaginaOportunidade, OfertasRelacionadas, Breadcrumb) — e transformar essas
 * páginas inteiras em cliente para traduzir um rótulo seria pagar caro demais:
 * elas leem o banco e não devem ir para o navegador.
 *
 * ★ Este componente é a menor unidade de cliente possível: lê o idioma do
 * caminho (como todo o resto) e devolve uma string. O server component ao redor
 * continua servidor.
 *
 * ⚠️ `usePathname` funciona na renderização do servidor também — o App Router
 * fornece o contexto do roteador no SSR —, então o HTML já sai no idioma certo
 * e não há piscada nem divergência de hidratação.
 */
export function Texto({ chave }: { chave: ChaveTexto }) {
  return <>{useTextos()(chave)}</>;
}
