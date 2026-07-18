import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GerenciadorBuscas, type BuscaSalvaRow } from "@/components/GerenciadorBuscas";
import { buscarMarcasComContagem } from "@/lib/marcas";
import { UFS } from "@/lib/mascaras";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BuscasPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null; // guarda real (premium/admin) em app/(pro)/layout.tsx

  const [contagens, estadosDisponiveis, marcas, buscasResp] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
    buscarMarcasComContagem(),
    supabaseAdmin
      .from("buscas_salvas")
      .select("id, nome, marca, modelo, preco_min, preco_max, estado, ano_min, ano_max, km_max, margem_min, frequencia, ativo, criado_em")
      .eq("user_id", usuario.id)
      .order("criado_em", { ascending: false }),
  ]);

  const buscas = (buscasResp.data ?? []) as BuscaSalvaRow[];
  const nomesMarcas = marcas.map((m) => m.marca);

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} usuarioLogado={true} />
          <main className="conteudo">
            <GerenciadorBuscas buscas={buscas} marcas={nomesMarcas} estados={UFS} />
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
