import Link from "next/link";
import { Search } from "lucide-react";
import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { buscarSugestoes404 } from "@/lib/sugestoes404";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const revalidate = 3600;

export default async function NaoEncontrado() {
  const usuario = await obterUsuarioAtual();
  const [contagens, estadosDisponiveis, sugestoes] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
    buscarSugestoes404(),
  ]);

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar
            abaAtiva="aprovadas"
            contagens={contagens}
            role={usuario?.role ?? null}
            usuarioLogado={Boolean(usuario)}
          />
          <main className="conteudo">
            <section className="pagina-404">
              <p className="pagina-404-codigo">404</p>
              <h1 className="pagina-404-titulo">Essa página não existe (mais)</h1>
              <p className="pagina-404-texto">
                O anúncio pode ter saído do ar ou o link está incorreto. Mas tem bastante oportunidade
                rolando por aqui ainda:
              </p>
              <Link href="/" className="pagina-404-botao">
                <Search size={16} strokeWidth={2} /> Ver todas as oportunidades
              </Link>

              {sugestoes.cidades.length > 0 && (
                <div className="pagina-404-secao">
                  <h2 className="pagina-404-secao-titulo">Cidades com mais oportunidades</h2>
                  <div className="pagina-404-links">
                    {sugestoes.cidades.map((cidade) => (
                      <Link key={cidade.caminho} href={cidade.caminho} className="pagina-404-link">
                        {cidade.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {sugestoes.marcas.length > 0 && (
                <div className="pagina-404-secao">
                  <h2 className="pagina-404-secao-titulo">Marcas mais procuradas</h2>
                  <div className="pagina-404-links">
                    {sugestoes.marcas.map((marca) => (
                      <Link key={marca.caminho} href={marca.caminho} className="pagina-404-link">
                        {marca.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
