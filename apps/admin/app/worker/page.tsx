import { redirect } from "next/navigation";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PainelWorker, type ConfigWorker, type RunWorker } from "@/components/PainelWorker";
import { Sidebar } from "@/components/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const LIMITE_HISTORICO = 20;

export default async function WorkerPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.role !== "admin") {
    redirect("/");
  }

  const [{ data: runs, error: erroRuns }, { data: configs, error: erroConfigs }] = await Promise.all([
    supabaseAdmin
      .from("discovery_runs")
      .select("*")
      .order("iniciado_em", { ascending: false })
      .limit(LIMITE_HISTORICO),
    supabaseAdmin.from("worker_config").select("chave, valor"),
  ]);

  if (erroRuns) {
    throw new Error(`Falha ao buscar histórico de varreduras: ${erroRuns.message}`);
  }
  if (erroConfigs) {
    throw new Error(`Falha ao buscar config do worker: ${erroConfigs.message}`);
  }

  const contagens = await contarOportunidades(usuarioAtual);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">Motor de Descoberta</h1>
          <p className="usuarios-subtitulo">
            Acompanhe e controle o worker que varre a OLX em busca de oportunidades.
          </p>
          <PainelWorker runs={(runs ?? []) as RunWorker[]} configs={(configs ?? []) as ConfigWorker[]} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
