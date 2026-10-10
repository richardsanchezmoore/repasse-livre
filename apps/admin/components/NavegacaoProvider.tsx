"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { caminhoNoIdioma, idiomaDoCaminho } from "@/lib/idioma";

interface NavegacaoContexto {
  navegar: (url: string) => void;
  pendente: boolean;
}

const NavegacaoContext = createContext<NavegacaoContexto | null>(null);

export function NavegacaoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const caminhoAtual = usePathname();
  const [pendente, iniciarTransicao] = useTransition();

  /**
   * ★★ A NAVEGAÇÃO CARREGA O IDIOMA JUNTO. Quase todo destino do site é montado
   * como caminho absoluto (`/carros/...`, `/?marca=toyota`) — sem isto, quem
   * estivesse em `/pt` seria jogado de volta para o espanhol no primeiro filtro
   * que clicasse, e culparia o site, não a tradução.
   *
   * ⚠️ Só mexe em caminho interno. URL absoluta (`https://...`) e âncora (`#`)
   * passam intactas: prefixar `https://wa.me/...` com `/pt` quebraria o link.
   */
  function navegar(url: string) {
    const idioma = idiomaDoCaminho(caminhoAtual);
    let destino = url;
    if (idioma === "pt" && url.startsWith("/") && !url.startsWith("//")) {
      const corte = url.search(/[?#]/);
      const so = corte === -1 ? url : url.slice(0, corte);
      const resto = corte === -1 ? "" : url.slice(corte);
      destino = caminhoNoIdioma(so, "pt") + resto;
    }
    iniciarTransicao(() => router.push(destino));
  }

  return <NavegacaoContext.Provider value={{ navegar, pendente }}>{children}</NavegacaoContext.Provider>;
}

export function useNavegacao(): NavegacaoContexto {
  const contexto = useContext(NavegacaoContext);
  if (!contexto) {
    throw new Error("useNavegacao precisa ser usado dentro de NavegacaoProvider");
  }
  return contexto;
}
