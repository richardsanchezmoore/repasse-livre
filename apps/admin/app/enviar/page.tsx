import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { FormularioEnvio } from "@/components/FormularioEnvio";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EnviarOportunidadePage() {
  const siteKeyTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const usuario = await obterUsuarioAtual();
  const [contagens, estadosDisponiveis] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
  ]);

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar
            abaAtiva="aprovadas"
            contagens={contagens}
            role={usuario?.role ?? null}
            usuarioLogado={Boolean(usuario)}
          />
          <main className="conteudo">
            <div className="pagina-publica">
              <h1>Envie uma oportunidade</h1>
              <p className="pagina-publica-intro">
                Encontrou um carro abaixo da tabela FIPE? Envie aqui — se a margem for
                de pelo menos 5%, sua oportunidade entra na fila de revisão.
              </p>
              <FormularioEnvio siteKeyTurnstile={siteKeyTurnstile} />
            </div>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
