import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { FormularioPagina } from "@/components/FormularioPagina";
import { buscarPaginaParaEditor } from "@/lib/cms";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditarPaginaPage({ params }: { params: { slug: string } }) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const [pagina, contagens] = await Promise.all([
    buscarPaginaParaEditor(params.slug),
    contarOportunidades(usuario),
  ]);
  if (!pagina) notFound();

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main className="usuarios-pagina">
          <Link href="/conteudo" className="cms-voltar"><ChevronLeft size={16} /> Conteúdo</Link>
          <h1 className="usuarios-titulo">Editar página</h1>
          <FormularioPagina pagina={pagina} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
