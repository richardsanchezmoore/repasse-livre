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
// O FB roda por REGIÃO (5×/dia cada), várias cidades por estado → precisa de mais
// linhas pra cada estado aparecer no agrupamento por UF da aba Facebook.
const LIMITE_FACEBOOK = 200;

/** Regiões FB do painel (FACEBOOK_REGIOES) — dá a UF/nome de cada run pelo casamento
 * do segmento /marketplace/<seg>/ (a categoria_url do run não carrega o estado). */
function lerRegioesFacebook(bruto: string | undefined): { nome: string; url: string; uf: string }[] {
  if (!bruto) return [];
  try {
    const arr = JSON.parse(bruto);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({ nome: String(r?.nome ?? ""), url: String(r?.url ?? ""), uf: String(r?.uf ?? "").toUpperCase() }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

export default async function WorkerPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real já em app/(painel)/layout.tsx — isto só estreita o tipo p/ TS

  const historicoPorFonte = (padrao: string, limite = LIMITE_POR_FONTE) =>
    supabaseAdmin
      .from("discovery_runs")
      .select("*")
      .ilike("categoria_url", padrao)
      .order("iniciado_em", { ascending: false })
      .limit(limite);

  const [olx, webmotors, mercadoLivre, facebook, { data: configs, error: erroConfigs }] = await Promise.all([
    historicoPorFonte("%olx%"),
    historicoPorFonte("%webmotors%"),
    historicoPorFonte("%mercadoli%"), // pega mercadolivre.com.br e mercadolibre
    historicoPorFonte("%facebook%", LIMITE_FACEBOOK),
    supabaseAdmin.from("worker_config").select("chave, valor"),
  ]);

  const erroRuns = olx.error ?? webmotors.error ?? mercadoLivre.error ?? facebook.error;
  if (erroRuns) {
    throw new Error(`Falha ao buscar histórico de varreduras: ${erroRuns.message}`);
  }
  if (erroConfigs) {
    throw new Error(`Falha ao buscar config do worker: ${erroConfigs.message}`);
  }
  const runs = [
    ...(olx.data ?? []),
    ...(webmotors.data ?? []),
    ...(mercadoLivre.data ?? []),
    ...(facebook.data ?? []),
  ];
  const regioesFacebook = lerRegioesFacebook((configs ?? []).find((c) => c.chave === "FACEBOOK_REGIOES")?.valor);

  const contagens = await contarOportunidades(usuarioAtual);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">Motor de Descoberta</h1>
          <p className="usuarios-subtitulo">
            Acompanhe e controle os workers que varrem OLX, Webmotors, Mercado Livre e Facebook em busca de oportunidades.
          </p>
          <PainelWorker
            runs={(runs ?? []) as RunWorker[]}
            configs={(configs ?? []) as ConfigWorker[]}
            regioesFacebook={regioesFacebook}
          />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
