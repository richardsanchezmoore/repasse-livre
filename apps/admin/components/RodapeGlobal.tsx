"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROTAS_PAINEL_ADMIN } from "@/lib/painelAdmin";
import { useTextos } from "@/lib/useIdioma";

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
  const tx = useTextos();
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
            {/* ⚠️ A tagline do rodapé aparece em TODA página — era a menção
                de FIPE mais visível que sobrava no site. */}
            {tx("rodapeTagline")}
          </p>
        </div>
        <nav className="rodape-global-links" aria-label="Links do rodapé">
          <div className="rodape-global-coluna">
            <span className="rodape-global-titulo">{tx("navegar")}</span>
            <Link href="/">{tx("inicio")}</Link>
            <Link href="/enviar">{tx("anunciar")}</Link>
          </div>
          <div className="rodape-global-coluna">
            <span className="rodape-global-titulo">{tx("legal")}</span>
            <Link href="/privacidade">{tx("privacidade")}</Link>
            <Link href="/termos">{tx("termosDeUso")}</Link>
            <Link href="/exclusao-de-dados">{tx("exclusaoDeDados")}</Link>
          </div>
        </nav>
      </div>
      <div className="rodape-global-base" suppressHydrationWarning>
        © 2009-{anoAtual} JEM Global Technology. Todos os direitos reservados.
      </div>
    </footer>
  );
}
