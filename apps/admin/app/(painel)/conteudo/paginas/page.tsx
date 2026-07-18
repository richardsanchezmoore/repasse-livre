import Link from "next/link";
import { Pencil } from "lucide-react";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { ConteudoTabs } from "@/components/ConteudoTabs";
import { listarPaginas } from "@/lib/cms";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function ConteudoPaginasPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const [paginas, contagens] = await Promise.all([listarPaginas(), contarOportunidades(usuario)]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main className="usuarios-pagina">
          <div className="cms-cabecalho">
            <div>
              <h1 className="usuarios-titulo">Conteúdo</h1>
              <p className="usuarios-subtitulo">Páginas do site (institucionais).</p>
            </div>
          </div>

          <ConteudoTabs ativa="paginas" />

          <section className="cms-lista-secao">
            <ul className="cms-lista">
              {paginas.map((p) => (
                <li key={p.slug}>
                  <Link href={`/conteudo/paginas/${p.slug}`} className="cms-item">
                    <span className="cms-item-info">
                      <span className="cms-item-titulo">{p.titulo}</span>
                      <span className="cms-item-sub">/{p.slug} · atualizado {FMT.format(new Date(p.atualizadoEm))}</span>
                    </span>
                    <Pencil size={16} className="cms-item-seta" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </NavegacaoProvider>
  );
}
