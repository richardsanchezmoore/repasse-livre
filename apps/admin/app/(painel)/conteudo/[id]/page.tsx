import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { FormularioPost } from "@/components/FormularioPost";
import { buscarPostParaEditor } from "@/lib/cms";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditarPostPage({ params }: { params: { id: string } }) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const [post, contagens] = await Promise.all([
    buscarPostParaEditor(params.id),
    contarOportunidades(usuario),
  ]);
  if (!post) notFound();

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main className="usuarios-pagina">
          <Link href="/conteudo" className="cms-voltar"><ChevronLeft size={16} /> Conteúdo</Link>
          <h1 className="usuarios-titulo">Editar post</h1>
          <FormularioPost post={post} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
