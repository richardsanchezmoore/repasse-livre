import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelBia } from "@/components/PainelBia";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  buscarCidadesMaisAtivas,
  buscarDescobertasPorDia,
  buscarEstadosMaisAtivos,
  buscarMaisDisputados,
  buscarMarcasLuxoPorEstado,
  buscarResumoBia,
  buscarTendenciaPrincipais,
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
    tendencias,
    estadosDisponiveis,
  ] = await Promise.all([
    contarOportunidades(usuarioAtual),
    buscarResumoBia(),
    buscarDescobertasPorDia(7),
    buscarDescobertasPorDia(30),
    buscarValorPotencialHistorico(30),
    buscarMaisDisputados(500), // pool completo (~400 modelos); o painel corta o top por seleção
    buscarMarcasLuxoPorEstado(),
    buscarEstadosMaisAtivos(),
    buscarCidadesMaisAtivas(250), // pool amplo → o painel filtra por estado e corta o top na exibição
    buscarTendenciaPrincipais(6),
    buscarEstadosDisponiveis(),
  ]);

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuarioAtual} />
        <div className="layout">
          <Sidebar
            abaAtiva="descobertas"
            contagens={contagens}
            role={usuarioAtual.role}
            usuarioLogado={true}
          />
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
              tendencias={tendencias}
              isAdmin={usuarioAtual.role === "admin"}
            />
          </div>
        </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
