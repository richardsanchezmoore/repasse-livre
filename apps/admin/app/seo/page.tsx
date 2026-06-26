import { redirect } from "next/navigation";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelSeo } from "@/components/PainelSeo";
import { Sidebar } from "@/components/Sidebar";
import { buscarTodasConfigsSeo } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SeoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.role !== "admin") {
    redirect("/");
  }

  const [configs, contagens] = await Promise.all([buscarTodasConfigsSeo(), contarOportunidades(usuarioAtual)]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">SEO</h1>
          <p className="usuarios-subtitulo">Edite título, descrição e imagem de compartilhamento de cada página.</p>
          <PainelSeo configs={configs} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
