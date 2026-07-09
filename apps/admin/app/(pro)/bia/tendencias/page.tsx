import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { BiaTendencias } from "@/components/BiaTendencias";
import { Sidebar } from "@/components/Sidebar";
import { buscarTendenciaDestaques, buscarTendenciaMensal } from "@/lib/biaDashboard";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BiaTendenciasPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real (premium/admin) em app/(pro)/layout.tsx

  const [contagens, tendenciaMensal, tendenciaDestaques] = await Promise.all([
    contarOportunidades(usuarioAtual),
    buscarTendenciaMensal(6),
    buscarTendenciaDestaques(20),
  ]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuarioAtual.role} />
        <main className="bia-pagina">
          <div className="bia-pagina-fundo">
            <header className="bia-header">
              <div className="bia-status-linha">
                <span className="bia-status-ponto" />
                <span className="bia-eyebrow">Fase 4 · Inteligência de mercado</span>
              </div>
              <div className="bia-headline-linha">
                <h1 className="bia-headline">
                  Tendência mensal
                  <br />
                  <span className="bia-headline-fraco">por marca e modelo.</span>
                </h1>
              </div>
              <p className="bia-subtitulo">
                Margem média e volume de oferta, mês a mês — só existe porque o Repasse Livre acumula
                histórico diário desde 27/06/2026 (a OLX não mostra mais do que os últimos dias).
              </p>
            </header>
            <BiaTendencias tendenciaMensal={tendenciaMensal} destaques={tendenciaDestaques} />
          </div>
        </main>
      </div>
    </NavegacaoProvider>
  );
}
