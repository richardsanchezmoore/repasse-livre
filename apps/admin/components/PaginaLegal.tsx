import Link from "next/link";

/**
 * Shell enxuto pras páginas legais/estáticas (privacidade, termos, exclusão de
 * dados) — logo linkando pra home, coluna de leitura e rodapé com os links
 * legais. Não usa o TopBar (que é a barra de busca/navegação, pesada e com
 * contextos). Server component, sem estado.
 */
export function PaginaLegal({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: React.ReactNode;
}) {
  const anoAtual = new Date().getFullYear();
  return (
    <div className="pagina-legal">
      <header className="pagina-legal-topo">
        <Link href="/" className="pagina-legal-logo-link" aria-label="Ir para a página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Repasse Livre" className="pagina-legal-logo" />
        </Link>
        <Link href="/" className="pagina-legal-voltar">
          ← Início
        </Link>
      </header>

      <main className="pagina-legal-conteudo">
        <h1 className="pagina-legal-titulo">{titulo}</h1>
        <p className="pagina-legal-atualizado">Última atualização: {atualizadoEm}</p>
        <div className="pagina-legal-corpo">{children}</div>
      </main>

      <footer className="pagina-legal-rodape">
        <nav className="pagina-legal-rodape-links">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/exclusao-de-dados">Exclusão de dados</Link>
        </nav>
        <p>© 2009-{anoAtual} JEM Global Technology. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
