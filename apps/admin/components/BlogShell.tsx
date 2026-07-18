import Link from "next/link";

/**
 * Casco público do blog — mesmo espírito do PaginaLegal (logo → home, coluna de
 * leitura, rodapé com links legais). Server component, sem estado. O RodapeGlobal
 * se esconde em /blog (ver RodapeGlobal), então o rodapé daqui é o único.
 */
export function BlogShell({ children }: { children: React.ReactNode }) {
  const anoAtual = new Date().getFullYear();
  return (
    <div className="blog">
      <header className="blog-topo">
        <Link href="/" className="blog-logo-link" aria-label="Ir para a página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Repasse Livre" className="blog-logo" />
        </Link>
        <nav className="blog-topo-nav">
          <Link href="/blog" className="blog-topo-link">Blog</Link>
          <Link href="/" className="blog-topo-link">Ver ofertas →</Link>
        </nav>
      </header>

      <main className="blog-conteudo">{children}</main>

      <footer className="blog-rodape">
        <nav className="blog-rodape-links">
          <Link href="/">Início</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
        </nav>
        <p>© 2009-{anoAtual} JEM Global Technology. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
