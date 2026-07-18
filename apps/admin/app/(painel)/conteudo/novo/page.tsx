import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { FormularioPost } from "@/components/FormularioPost";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NovoPostPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const contagens = await contarOportunidades(usuario);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main className="usuarios-pagina">
          <Link href="/conteudo" className="cms-voltar"><ChevronLeft size={16} /> Conteúdo</Link>
          <h1 className="usuarios-titulo">Novo post</h1>
          <FormularioPost />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
