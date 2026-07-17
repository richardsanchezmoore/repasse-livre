import { redirect } from "next/navigation";
import Link from "next/link";
import { Gem, ScanSearch, IdCard, Car, Heart, BellRing, ChevronRight, Lock } from "lucide-react";
import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { BotaoSair } from "@/components/BotaoSair";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarWhatsappSuporte } from "@/lib/configWorker";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FMT_DATA.format(d);
}

/** Rótulo amigável do status cru da Stripe. */
function rotuloStatus(status: string | null): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "trialing":
      return "Em período de teste";
    case "past_due":
      return "Pagamento pendente";
    case "canceled":
      return "Cancelada";
    case "unpaid":
      return "Não paga";
    default:
      return status ?? "—";
  }
}

export default async function ContaPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    redirect("/login?redirect=%2Fconta");
  }

  const [contagens, estadosDisponiveis, whatsappSuporte] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
    buscarWhatsappSuporte(),
  ]);

  const ehPro = usuario.premium; // manual (cortesia) OU assinatura ativa
  const ehAdmin = usuario.role === "admin";
  // Assinatura ATIVA (dentro da validade). Cancelada/expirada → cai no "Gratuito"
  // com "Conhecer o PRO" (pode reassinar), em vez de travar num "gerenciar".
  const expiraMs = usuario.premiumExpiraEm ? new Date(usuario.premiumExpiraEm).getTime() : 0;
  const assinaturaAtiva =
    (usuario.assinaturaStatus === "active" || usuario.assinaturaStatus === "trialing") && expiraMs > Date.now();
  const gerenciarUrl = whatsappSuporte
    ? `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent("Olá! Quero gerenciar minha assinatura do Repasse Livre PRO.")}`
    : null;
  const dadosIncompletos = !usuario.nome || !usuario.whatsapp;
  const validade = formatarData(usuario.premiumExpiraEm);
  const inicial = (usuario.nome ?? usuario.email ?? "?").charAt(0).toUpperCase();
  const podeAbrirBia = ehPro || ehAdmin;

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} usuarioLogado={true} />
          <main className="conteudo">
            <div className="conta">
              <header className="conta-cabecalho">
                <span className="conta-avatar">
                  {usuario.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={usuario.avatarUrl} alt="" className="conta-avatar-img" referrerPolicy="no-referrer" />
                  ) : (
                    inicial
                  )}
                </span>
                <div className="conta-cabecalho-info">
                  <h1 className="conta-nome">{usuario.nome ?? "Minha conta"}</h1>
                  <p className="conta-email">{usuario.email}</p>
                </div>
                <span className={`conta-selo ${ehPro ? "conta-selo-pro" : "conta-selo-free"}`}>
                  <Gem size={14} strokeWidth={2} /> {ehPro ? "PRO" : "Gratuito"}
                </span>
              </header>

              <section className="conta-card">
                {assinaturaAtiva ? (
                  <>
                    <h2 className="conta-card-titulo">Seu plano</h2>
                    <p className="conta-plano-nome">
                      Plano <strong>PRO</strong> · {rotuloStatus(usuario.assinaturaStatus)}
                    </p>
                    {validade && <p className="conta-muted">Renova em {validade}</p>}
                    <AcaoAssinatura estado="gerenciar" gerenciarUrl={gerenciarUrl} />
                  </>
                ) : ehPro ? (
                  <>
                    <h2 className="conta-card-titulo">Seu plano</h2>
                    <p className="conta-plano-nome">
                      Plano <strong>PRO</strong> {ehAdmin ? "(admin)" : "(cortesia)"}
                    </p>
                    <p className="conta-muted">Acesso liberado manualmente — sem cobrança.</p>
                  </>
                ) : (
                  <>
                    <h2 className="conta-card-titulo">
                      Você está no plano <strong>Gratuito</strong>
                    </h2>
                    <p className="conta-plano-headline">Quem chega primeiro compra melhor.</p>
                    <p className="conta-muted">
                      Desbloqueie as oportunidades com maior potencial de lucro. Receba alertas inteligentes e
                      análises exclusivas para comprar melhor, aumentar sua margem e chegar antes da concorrência.
                    </p>
                    <div className="conta-plano-acoes">
                      <Link href="/planos" className="conta-cta">
                        <Gem size={16} strokeWidth={2} /> Desbloquear o PRO
                      </Link>
                      <Link href="/" className="conta-cta-secundario">
                        Ver oportunidades de menor margem
                      </Link>
                    </div>
                  </>
                )}
              </section>

              <section className="conta-card">
                <h2 className="conta-card-titulo">Acessos</h2>
                <nav className="conta-atalhos">
                  <Link href="/completar-dados" className="conta-atalho">
                    <IdCard size={20} strokeWidth={1.9} className="conta-atalho-icone" />
                    <span className="conta-atalho-texto">
                      <span className="conta-atalho-titulo">Meus dados</span>
                      <span className="conta-atalho-sub">Nome e WhatsApp usados ao anunciar</span>
                    </span>
                    {dadosIncompletos ? (
                      <span className="conta-atalho-alerta">Completar</span>
                    ) : (
                      <ChevronRight size={18} className="conta-atalho-seta" />
                    )}
                  </Link>

                  <Link href={podeAbrirBia ? "/bia" : "/planos"} className="conta-atalho">
                    <ScanSearch size={20} strokeWidth={1.9} className="conta-atalho-icone" />
                    <span className="conta-atalho-texto">
                      <span className="conta-atalho-titulo">Inteligência de mercado (BIA)</span>
                      <span className="conta-atalho-sub">Tendências, mais disputados e mapa por região</span>
                    </span>
                    {podeAbrirBia ? (
                      <ChevronRight size={18} className="conta-atalho-seta" />
                    ) : (
                      <span className="conta-atalho-pro">
                        <Lock size={12} strokeWidth={2.5} /> PRO
                      </span>
                    )}
                  </Link>

                  {/* Reserva o lugar do módulo de alertas (buscas salvas → aviso
                      no WhatsApp/push quando entra anúncio na faixa/modelo). Ainda
                      não navega — ver project_repasse_livre_notificacoes_predefinicoes. */}
                  <div className="conta-atalho conta-atalho-embreve" aria-disabled="true">
                    <BellRing size={20} strokeWidth={1.9} className="conta-atalho-icone" />
                    <span className="conta-atalho-texto">
                      <span className="conta-atalho-titulo">Buscas salvas</span>
                      <span className="conta-atalho-sub">Avisos automáticos do carro que você procura</span>
                    </span>
                    <span className="conta-atalho-badges">
                      {!ehPro && (
                        <span className="conta-atalho-pro">
                          <Lock size={12} strokeWidth={2.5} /> PRO
                        </span>
                      )}
                      <span className="conta-atalho-soon">Em breve</span>
                    </span>
                  </div>

                  <Link href="/?aba=favoritos" className="conta-atalho">
                    <Heart size={20} strokeWidth={1.9} className="conta-atalho-icone" />
                    <span className="conta-atalho-texto">
                      <span className="conta-atalho-titulo">Favoritos</span>
                      <span className="conta-atalho-sub">Anúncios que você salvou</span>
                    </span>
                    <ChevronRight size={18} className="conta-atalho-seta" />
                  </Link>

                  <Link href="/enviar" className="conta-atalho">
                    <Car size={20} strokeWidth={1.9} className="conta-atalho-icone" />
                    <span className="conta-atalho-texto">
                      <span className="conta-atalho-titulo">Anunciar um veículo</span>
                      <span className="conta-atalho-sub">Coloque seu carro na vitrine</span>
                    </span>
                    <ChevronRight size={18} className="conta-atalho-seta" />
                  </Link>
                </nav>
              </section>

              <BotaoSair />
            </div>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
