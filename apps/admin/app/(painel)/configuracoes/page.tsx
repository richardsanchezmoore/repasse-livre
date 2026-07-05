import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { PainelConfiguracoes } from "@/components/PainelConfiguracoes";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ConfiguracoesPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null; // guarda real em app/(painel)/layout.tsx

  const [contagens, { data }] = await Promise.all([
    contarOportunidades(usuario),
    supabaseAdmin.from("worker_config").select("chave, valor"),
  ]);
  const configs = Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor as string]));

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="descobertas" contagens={contagens} role={usuario.role} />
        <main className="conteudo">
          <PainelConfiguracoes configs={configs} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
