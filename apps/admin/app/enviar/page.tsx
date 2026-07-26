import { redirect } from "next/navigation";
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
  // Anunciar passou a exigir conta — quem chega deslogado (link direto,
  // favorito antigo etc.) volta pra cá automaticamente depois do login.
  if (!usuario) {
    redirect("/login?redirect=%2Fenviar");
  }
  // Anunciar de graça virou perk de PRO/admin. Não-PRO → produto pago /vender
  // (R$29,90 por anúncio). Ver project_repasse_livre_low_ticket_vender_anuncio.
  if (!usuario.premium && usuario.role !== "admin") {
    redirect("/vender");
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
              <FormularioEnvio
                siteKeyTurnstile={siteKeyTurnstile}
                nomeInicial={usuario.nome}
                whatsappInicial={usuario.whatsapp}
              />
            </div>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
