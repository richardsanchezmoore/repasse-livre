"use client";

import { usePathname } from "next/navigation";
import { idiomaDoCaminho, t, type Idioma } from "./idioma";

/**
 * O idioma da página, para componentes de cliente.
 *
 * ★ Vem do CAMINHO, não de contexto nem de storage: o caminho é a mesma fonte
 * que o servidor usou para renderizar, então cliente e servidor nunca divergem —
 * e divergência de hidratação em texto é o tipo de bug que aparece como "sumiu
 * uma palavra" e custa uma hora para achar.
 *
 * ⚠️ Não precisa de provider. Se um dia precisar, o provider lê daqui, nunca o
 * contrário.
 */
export function useIdioma(): Idioma {
  return idiomaDoCaminho(usePathname());
}

/** Atalho: `const tx = useTextos(); tx("moedaAnunciada")`. */
export function useTextos() {
  return t(useIdioma());
}
