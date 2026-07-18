"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROTAS_PAINEL_ADMIN } from "@/lib/painelAdmin";

/**
 * Rodapé global do site público. Renderizado no root layout, mas SE ESCONDE nas
 * telas que já têm o próprio rodapé/links (auth e páginas legais) e no painel
 * admin — pra aparecer só na vitrine pública (home, /carros, /oportunidade,
 * /enviar). Client component só por causa do usePathname.
 */
const PREFIXOS_OCULTOS = [
  "/login",
  "/cadastro",
  "/redefinir-senha",
  "/completar-dados",
  "/privacidade",
  "/termos",
  "/exclusao-de-dados",
  "/blog",
  ...ROTAS_PAINEL_ADMIN,
];

export function RodapeGlobal() {
  const pathname = usePathname();
  if (PREFIXOS_OCULTOS.some((prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`))) {
    return null;
  }

  const anoAtual = new Date().getFullYear();

  return (
    <footer className="rodape-global">
      <div className="rodape-global-conteudo">
        <div className="rodape-global-marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Repasse Livre" className="rodape-global-logo" />
          <p className="rodape-global-tagline">
            Oportunidades de carros anunciados abaixo da tabela FIPE, atualizadas todos os dias.
          </p>
        </div>
        <nav className="rodape-global-links" aria-label="Links do rodapé">
          <div className="rodape-global-coluna">
            <span className="rodape-global-titulo">Navegar</span>
            <Link href="/">Início</Link>
            <Link href="/enviar">Anunciar</Link>
          </div>
          <div className="rodape-global-coluna">
            <span className="rodape-global-titulo">Legal</span>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/exclusao-de-dados">Exclusão de dados</Link>
          </div>
        </nav>
      </div>
      <div className="rodape-global-base" suppressHydrationWarning>
        © 2009-{anoAtual} JEM Global Technology. Todos os direitos reservados.
      </div>
    </footer>
  );
}
