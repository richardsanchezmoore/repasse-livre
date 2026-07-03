import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelWorker, type ConfigWorker, type RunWorker } from "@/components/PainelWorker";
import { Sidebar } from "@/components/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Por fonte, não global: a OLX/ML rodam muitas vezes ao dia e soterravam o run
// diário da Webmotors num limite único. Buscamos os N mais recentes de CADA
// fonte (via padrão da categoria_url — discovery_runs não tem coluna `fonte`) e
// as abas do painel filtram no cliente. Ver PainelWorker.
const LIMITE_POR_FONTE = 20;

export default async function WorkerPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real já em app/(painel)/layout.tsx — isto só estreita o tipo p/ TS

  const historicoPorFonte = (padrao: string) =>
    supabaseAdmin
      .from("discovery_runs")
      .select("*")
      .ilike("categoria_url", padrao)
      .order("iniciado_em", { ascending: false })
      .limit(LIMITE_POR_FONTE);

  const [olx, webmotors, mercadoLivre, { data: configs, error: erroConfigs }] = await Promise.all([
    historicoPorFonte("%olx%"),
    historicoPorFonte("%webmotors%"),
    historicoPorFonte("%mercadoli%"), // pega mercadolivre.com.br e mercadolibre
    supabaseAdmin.from("worker_config").select("chave, valor"),
  ]);

  const erroRuns = olx.error ?? webmotors.error ?? mercadoLivre.error;
  if (erroRuns) {
    throw new Error(`Falha ao buscar histórico de varreduras: ${erroRuns.message}`);
  }
  if (erroConfigs) {
    throw new Error(`Falha ao buscar config do worker: ${erroConfigs.message}`);
  }
  const runs = [...(olx.data ?? []), ...(webmotors.data ?? []), ...(mercadoLivre.data ?? [])];

  const contagens = await contarOportunidades(usuarioAtual);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">Motor de Descoberta</h1>
          <p className="usuarios-subtitulo">
            Acompanhe e controle os workers que varrem OLX, Webmotors e Mercado Livre em busca de oportunidades.
          </p>
          <PainelWorker runs={(runs ?? []) as RunWorker[]} configs={(configs ?? []) as ConfigWorker[]} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
