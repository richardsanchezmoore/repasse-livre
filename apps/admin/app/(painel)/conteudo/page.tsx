import Link from "next/link";
import { Plus, FileText, Pencil, Files } from "lucide-react";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { listarPostsAdmin, listarPaginas } from "@/lib/cms";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function ConteudoPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null; // guarda real em app/(painel)/layout.tsx

  const [posts, paginas, contagens] = await Promise.all([listarPostsAdmin(), listarPaginas(), contarOportunidades(usuario)]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main className="usuarios-pagina">
          <div className="cms-cabecalho">
            <div>
              <h1 className="usuarios-titulo">Conteúdo</h1>
              <p className="usuarios-subtitulo">Posts do blog e páginas do site.</p>
            </div>
            <Link href="/conteudo/novo" className="cms-novo">
              <Plus size={16} strokeWidth={2.4} /> Novo post
            </Link>
          </div>

          {/* Páginas institucionais (conjunto fixo — edita, não cria/apaga). */}
          <section className="cms-lista-secao">
            <h2 className="cms-secao-titulo"><Files size={15} /> Páginas {paginas.length > 0 && <span className="cms-contador">{paginas.length}</span>}</h2>
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

          <section className="cms-lista-secao">
            <h2 className="cms-secao-titulo"><FileText size={15} /> Blog {posts.length > 0 && <span className="cms-contador">{posts.length}</span>}</h2>
            {posts.length === 0 ? (
              <p className="cms-vazio">Nenhum post ainda. Crie o primeiro. 👆</p>
            ) : (
              <ul className="cms-lista">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/conteudo/${p.id}`} className="cms-item">
                      <span className="cms-item-info">
                        <span className="cms-item-titulo">{p.titulo || "(sem título)"}</span>
                        <span className="cms-item-sub">/blog/{p.slug} · atualizado {FMT.format(new Date(p.atualizadoEm))}</span>
                      </span>
                      <span className={`cms-selo cms-selo-${p.status}`}>{p.status === "publicado" ? "Publicado" : "Rascunho"}</span>
                      <Pencil size={16} className="cms-item-seta" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </NavegacaoProvider>
  );
}
