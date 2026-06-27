import { redirect } from "next/navigation";
import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { FormularioCompletarDados } from "@/components/FormularioCompletarDados";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CompletarDadosPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    redirect("/login?redirect=%2Fcompletar-dados");
  }

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
            role={usuario.role}
            usuarioLogado={true}
          />
          <main className="conteudo">
            <div className="pagina-publica">
              <h1>Complete seus dados</h1>
              <p className="pagina-publica-intro">
                Nome e WhatsApp usados automaticamente da próxima vez que você anunciar um veículo.
              </p>
              <FormularioCompletarDados nomeInicial={usuario.nome} whatsappInicial={usuario.whatsapp} />
            </div>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
