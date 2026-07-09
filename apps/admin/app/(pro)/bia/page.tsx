import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelBia } from "@/components/PainelBia";
import { Sidebar } from "@/components/Sidebar";
import {
  buscarCidadesMaisAtivas,
  buscarDescobertasPorDia,
  buscarEstadosMaisAtivos,
  buscarMaisDisputados,
  buscarMarcasLuxoPorEstado,
  buscarResumoBia,
  buscarTendenciaDestaques,
  buscarValorPotencialHistorico,
} from "@/lib/biaDashboard";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BiaPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real (premium/admin) em app/(pro)/layout.tsx

  const [
    contagens,
    resumo,
    descobertas7d,
    descobertas30d,
    valorPotencialHistorico,
    maisDisputados,
    marcasLuxo,
    estadosAtivos,
    cidadesAtivas,
    tendenciaDestaques,
  ] = await Promise.all([
    contarOportunidades(usuarioAtual),
    buscarResumoBia(),
    buscarDescobertasPorDia(7),
    buscarDescobertasPorDia(30),
    buscarValorPotencialHistorico(30),
    buscarMaisDisputados(20),
    buscarMarcasLuxoPorEstado(),
    buscarEstadosMaisAtivos(),
    buscarCidadesMaisAtivas(20),
    buscarTendenciaDestaques(5),
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
                <span className="bia-eyebrow">Inteligência de estoque · Seminovos</span>
              </div>
              <div className="bia-headline-linha">
                <h1 className="bia-headline">
                  Onde estão os carros
                  <br />
                  <span className="bia-headline-fraco">— e por quanto.</span>
                </h1>
              </div>
              <p className="bia-subtitulo">
                Tudo o que está acontecendo no mercado, com base no que o motor de descoberta já capturou.
              </p>
            </header>
            <PainelBia
              resumo={resumo}
              descobertas7d={descobertas7d}
              descobertas30d={descobertas30d}
              valorPotencialHistorico={valorPotencialHistorico}
              maisDisputados={maisDisputados}
              marcasLuxo={marcasLuxo}
              estadosAtivos={estadosAtivos}
              cidadesAtivas={cidadesAtivas}
              tendenciaDestaques={tendenciaDestaques}
            />
          </div>
        </main>
      </div>
    </NavegacaoProvider>
  );
}
