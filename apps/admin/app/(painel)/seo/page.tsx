import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelRastreio } from "@/components/PainelRastreio";
import { PainelSeo } from "@/components/PainelSeo";
import { Sidebar } from "@/components/Sidebar";
import { buscarConfigRastreio } from "@/lib/rastreio";
import { buscarTodasConfigsSeo } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SeoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real já em app/(painel)/layout.tsx — isto só estreita o tipo p/ TS

  const [configs, configRastreio, contagens] = await Promise.all([
    buscarTodasConfigsSeo(),
    buscarConfigRastreio(),
    contarOportunidades(usuarioAtual),
  ]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">SEO</h1>
          <p className="usuarios-subtitulo">Edite título, descrição e imagem de compartilhamento de cada página.</p>
          <PainelRastreio config={configRastreio} />
          <PainelSeo configs={configs} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
