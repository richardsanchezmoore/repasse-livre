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
  buscarValorPotencialHistorico,
} from "@/lib/biaDashboard";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BiaPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real já em app/(painel)/layout.tsx

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
  ]);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuarioAtual.role} />
        <main className="bia-pagina">
          <h1 className="usuarios-titulo">BIA — Business Intelligence Automotiva</h1>
          <p className="usuarios-subtitulo">
            Tudo o que está acontecendo no mercado, com base no que o motor de descoberta já capturou.
          </p>
          <PainelBia
            resumo={resumo}
            descobertas7d={descobertas7d}
            descobertas30d={descobertas30d}
            valorPotencialHistorico={valorPotencialHistorico}
            maisDisputados={maisDisputados}
            marcasLuxo={marcasLuxo}
            estadosAtivos={estadosAtivos}
            cidadesAtivas={cidadesAtivas}
          />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
