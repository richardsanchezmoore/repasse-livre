import type { Metadata } from "next";
import { Gem, Check, X, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { BotaoWhatsappSuporte } from "@/components/BotaoWhatsappSuporte";
import { ContadorOferta } from "@/components/ContadorOferta";
import { CapturaDestino } from "@/components/CapturaDestino";
import { ExperimenteDemo } from "@/components/ExperimenteDemo";
import { GaleriaPrints } from "@/components/GaleriaPrints";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarPrecoAncora, buscarWhatsappSuporte, buscarCaktoCheckoutUrl, buscarGatewayAtivo } from "@/lib/configWorker";
import { buscarOfertaDemo } from "@/lib/ofertaDemo";
import { buscarKpisTopo } from "@/lib/kpisTopo";

// Variante 2 da landing ("A vantagem competitiva" — FOMO). Reaproveita TODOS os
// componentes da /planos (contador, mockups, demo, galeria, logos); muda só o
// copy. noindex pra não competir com a /planos no Google (é um A/B).
export const metadata: Metadata = {
  title: "Repasse Livre PRO — chegue primeiro nas oportunidades abaixo da FIPE",
  description:
    "Enquanto outros procuram carros, os assinantes do Repasse Livre encontram oportunidades. O BIA monitora milhares de anúncios e entrega inteligência pra quem compra primeiro.",
  robots: { index: false, follow: true },
};

const PLATAFORMAS = [
  { nome: "OLX", logo: "/vendas/logos/olx.png", ativa: true },
  { nome: "Webmotors", logo: "/vendas/logos/webmotors.png", ativa: true },
  { nome: "Mercado Livre", logo: "/vendas/logos/mercadolivre.png", ativa: true },
  { nome: "Facebook Marketplace", logo: "/vendas/logos/facebook.png", ativa: false },
];

const SEM = [
  "Abrir OLX",
  "Abrir Webmotors",
  "Abrir Mercado Livre",
  "Comparar preços manualmente",
  "Conferir a FIPE de cada um",
  "Tentar descobrir se vale a pena",
];
const COM = [
  "O mercado é monitorado automaticamente",
  "As oportunidades aparecem organizadas",
  "O Copiloto analisa cada anúncio",
  "O BIA compara com o mercado",
  "Você decide muito mais rápido",
];
const PRODUTO = ["Tempo.", "Velocidade.", "Informação.", "Inteligência.", "Vantagem competitiva."];
const DESBLOQUEIA = [
  { emoji: "🧠", titulo: "BIA", texto: "Banco de Inteligência Automotiva" },
  { emoji: "🚗", titulo: "Copiloto de Compra", texto: "Análise inteligente de cada anúncio" },
  { emoji: "📊", titulo: "Comparativos de mercado", texto: "Cidade, estado e Brasil" },
  { emoji: "🎯", titulo: "Oportunidades abaixo da FIPE", texto: "Só o que está barato de verdade" },
  { emoji: "🔔", titulo: "Alertas inteligentes", texto: "Avisado assim que o carro certo entra" },
  { emoji: "⭐", titulo: "Score Repasse Livre", texto: "O quanto o negócio vale, num número" },
  { emoji: "📈", titulo: "Dashboard do mercado", texto: "Tendências em tempo real" },
];
const PLANO_INCLUI = ["BIA", "Copiloto", "Score", "Alertas", "Dashboard", "Comparativos"];

const FAQ = [
  {
    q: "Os anúncios são do Repasse Livre?",
    a: "Não. O Repasse Livre monitora e organiza oportunidades dos principais marketplaces automotivos do Brasil — OLX, Webmotors e Mercado Livre — transformando milhares de anúncios em inteligência de mercado.",
  },
  {
    q: "Os veículos ficam abaixo da FIPE?",
    a: "Sim. Nossa plataforma identifica automaticamente anúncios abaixo da FIPE e mostra esse percentual de forma clara, pra facilitar a comparação e a decisão.",
  },
  {
    q: "O que é o Copiloto?",
    a: "É o sistema de análise do Repasse Livre. Ele compara cada anúncio com veículos semelhantes monitorados pela plataforma e gera um parecer técnico baseado em dados reais do mercado, cruzando com o pensamento de analistas com larga experiência no setor automotivo.",
  },
  {
    q: "O que é o BIA?",
    a: "O BIA (Banco de Inteligência Automotiva) é o motor de inteligência do Repasse Livre. Ele monitora continuamente o mercado pra transformar dados dispersos em informação estratégica pra tomada de decisão.",
  },
];

/** Mockup de celular com um print da plataforma dentro da tela. */
function Fone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="vendas-fone" aria-hidden="true">
      <div className="vendas-fone-notch" />
      <div className="vendas-fone-tela">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}

export default async function PlanosSlimPage({
  searchParams,
}: {
  searchParams: Promise<{ assinatura?: string }>;
}) {
  const { assinatura } = await searchParams;
  const [usuario, preco, precoAncora, whatsappSuporte, ofertaDemo, kpis, caktoUrl, gatewayAtivo] = await Promise.all([
    obterUsuarioAtual(),
    buscarPrecoExibicao(),
    buscarPrecoAncora(),
    buscarWhatsappSuporte(),
    buscarOfertaDemo(),
    buscarKpisTopo(),
    buscarCaktoCheckoutUrl(),
    buscarGatewayAtivo(),
  ]);
  const abaixoFipeVivo = kpis.abaixoFipe >= 1000 ? Math.floor(kpis.abaixoFipe / 500) * 500 : null;
  const checkoutUrl =
    usuario && gatewayAtivo === "cakto" && caktoUrl
      ? `${caktoUrl}${caktoUrl.includes("?") ? "&" : "?"}sck=${usuario.id}`
      : null;
  const gerenciarUrl = whatsappSuporte
    ? `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent("Olá! Quero gerenciar minha assinatura do Repasse Livre PRO.")}`
    : null;

  // "gerenciar" só pra assinatura ATIVA (dentro da validade). Cancelado/expirado
  // → "assinar" (pode reassinar), senão o CTA cai no WhatsApp e prende o usuário.
  const expiraMs = usuario?.premiumExpiraEm ? new Date(usuario.premiumExpiraEm).getTime() : 0;
  const assinaturaAtiva =
    (usuario?.assinaturaStatus === "active" || usuario?.assinaturaStatus === "trialing") && expiraMs > Date.now();
  const estado: "entrar" | "assinar" | "gerenciar" = !usuario
    ? "entrar"
    : assinaturaAtiva
      ? "gerenciar"
      : "assinar";
  const jaPremium = Boolean(usuario?.premium);
  const descontoPct =
    precoAncora && precoAncora.centavos > preco.centavos
      ? Math.round((1 - preco.centavos / precoAncora.centavos) * 100)
      : null;

  return (
    <main className="vendas">
      <CapturaDestino />
      <ContadorOferta variante="barra" descontoPct={descontoPct} />
      <div className="vendas-faixa-posicao">
        A primeira plataforma de Inteligência Automotiva do Brasil
      </div>

      <div className="vendas-container">
        {assinatura === "sucesso" && (
          <div className="planos-aviso planos-aviso-ok">
            <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso PRO é liberado em instantes.
          </div>
        )}
        {assinatura === "cancelado" && (
          <div className="planos-aviso">Checkout cancelado. Quando quiser, é só voltar e assinar.</div>
        )}
      </div>

      {/* ───────── HERO ───────── */}
      <section className="vendas-hero vendas-container">
        <span className="vendas-selo">
          <Gem size={14} strokeWidth={2} /> Repasse Livre PRO
        </span>
        <h1 className="vendas-h1">
          Enquanto outros procuram carros, os assinantes do Repasse Livre PRO encontram{" "}
          <span>oportunidades</span>.
        </h1>
        <p className="vendas-hero-sub">
          Todos os dias o BIA monitora milhares de anúncios dos principais marketplaces do Brasil pra
          identificar veículos abaixo da FIPE, comparar preços, analisar o mercado e entregar inteligência
          pra quem compra primeiro.
        </p>

        {abaixoFipeVivo && (
          <div className="vendas-hero-stat">
            <span className="vendas-hero-stat-dot" />
            <span>
              <strong>Mais de {abaixoFipeVivo.toLocaleString("pt-BR")}</strong> oportunidades abaixo da FIPE
              monitoradas pelo BIA <b>agora</b>.
            </span>
          </div>
        )}

        <div className="vendas-oferta-box">
          <div className="vendas-precos">
            {precoAncora && <span className="vendas-preco-de">De {precoAncora.texto}/mês</span>}
            <div className="vendas-preco-por">
              <strong>{preco.valor}</strong>
              <span>{preco.intervalo}</span>
            </div>
          </div>
          <ContadorOferta variante="inline" />
        </div>

        <AcaoAssinatura
          estado={estado}
          rotulo="QUERO TER VANTAGEM NO MERCADO"
          checkoutUrl={checkoutUrl}
          gerenciarUrl={gerenciarUrl}
        />
        <p className="planos-cta-nota">
          {jaPremium ? "Você já é PRO." : "Sem fidelidade — cancele quando quiser."}
        </p>
      </section>

      {/* ───────── COBERTURA ───────── */}
      <section className="vendas-container vendas-cobertura">
        <p className="vendas-cobertura-titulo">O mercado inteiro, monitorado num lugar só.</p>
        <div className="vendas-logos">
          {PLATAFORMAS.map((p) => (
            <div key={p.nome} className={`vendas-logo${p.ativa ? "" : " vendas-logo--breve"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt={p.nome} />
              {!p.ativa && <span className="vendas-logo-breve">Em breve</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── O MERCADO NÃO ESPERA (FOMO) ───────── */}
      <section className="vendas-secao vendas-container vendas-centro">
        <span className="vendas-eyebrow">O mercado não espera</span>
        <h2 className="vendas-h2">Quem compra primeiro é quem encontrou primeiro.</h2>
        <p className="vendas-p">
          Todos os dias centenas de oportunidades aparecem. Todos os dias centenas desaparecem.
        </p>
        <p className="vendas-p vendas-p--forte">
          Você vai continuar procurando na mão… <span className="vendas-verde">ou deixa o BIA fazer por você?</span>
        </p>
      </section>

      {/* ───────── SEM × COM ───────── */}
      <section className="vendas-secao vendas-container">
        <div className="vendas-contraste">
          <div className="vendas-contraste-col vendas-contraste-col--nao">
            <h3>Sem o Repasse Livre</h3>
            <ul>
              {SEM.map((t) => (
                <li key={t}>
                  <X size={15} strokeWidth={2.6} /> {t}
                </li>
              ))}
            </ul>
            <p className="vendas-contraste-fecho">Enquanto isso, outra pessoa já fechou negócio.</p>
          </div>
          <div className="vendas-contraste-col vendas-contraste-col--sim">
            <h3>Com o Repasse Livre</h3>
            <ul>
              {COM.map((t) => (
                <li key={t}>
                  <Check size={15} strokeWidth={2.6} /> {t}
                </li>
              ))}
            </ul>
            <p className="vendas-contraste-fecho vendas-verde">Você decide muito mais rápido.</p>
          </div>
        </div>
      </section>

      {/* ───────── FAZ POR VOCÊ + MOCKUP ───────── */}
      <section className="vendas-secao vendas-split vendas-container">
        <div>
          <span className="vendas-eyebrow">Automático, todo dia</span>
          <h2 className="vendas-h2">Deixe o BIA garimpar por você.</h2>
          <p className="vendas-p">
            Ele varre o mercado sem parar e te entrega, organizado, só o que está abaixo da FIPE — com a
            análise pronta. Você para de procurar e passa a <strong>escolher</strong>.
          </p>
        </div>
        <Fone src="/vendas/home.png" alt="Painel do Repasse Livre" />
      </section>

      {/* ───────── O VERDADEIRO PRODUTO ───────── */}
      <section className="vendas-secao vendas-container vendas-centro">
        <span className="vendas-eyebrow">O verdadeiro produto</span>
        <h2 className="vendas-h2">Você não compra acesso a anúncios.</h2>
        <p className="vendas-p">Você compra:</p>
        <div className="vendas-produto">
          {PRODUTO.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </section>

      {/* ───────── O QUE VOCÊ DESBLOQUEIA + MOCKUP ───────── */}
      <section className="vendas-secao vendas-split vendas-split--inverso vendas-container">
        <Fone src="/vendas/anuncio-copiloto.png" alt="Parecer do Copiloto de Compra" />
        <div>
          <span className="vendas-eyebrow">O que você desbloqueia</span>
          <h2 className="vendas-h2">Tudo pra chegar primeiro.</h2>
          <div className="vendas-desbloqueia">
            {DESBLOQUEIA.map((d) => (
              <div key={d.titulo} className="vendas-desbloqueia-item">
                <span className="emoji">{d.emoji}</span>
                <div>
                  <h3>{d.titulo}</h3>
                  <p>{d.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── IMAGINE (08:12) + DEMO AO VIVO ───────── */}
      <section className="vendas-secao vendas-container">
        {ofertaDemo ? (
          <div className="vendas-split vendas-split--demo">
            <div>
              <span className="vendas-eyebrow">Imagine isso…</span>
              <h2 className="vendas-h2">08:12. Seu celular vibra: uma oferta acabou de entrar.</h2>
              <p className="vendas-p">
                Enquanto centenas de compradores ainda nem viram esse anúncio, você já está falando com o
                vendedor. Abre a oferta de exemplo e sinta como é chegar primeiro.
              </p>
              <p className="vendas-p vendas-p--forte">
                O mercado recompensa quem chega primeiro —{" "}
                <span className="vendas-verde">não quem procura por mais tempo.</span>
              </p>
            </div>
            <ExperimenteDemo oferta={ofertaDemo} />
          </div>
        ) : (
          <div className="vendas-centro">
            <span className="vendas-eyebrow">Imagine isso…</span>
            <h2 className="vendas-h2">08:12. Seu celular vibra com uma oferta abaixo da FIPE.</h2>
            <p className="vendas-p vendas-p--forte">
              Enquanto a maioria ainda procura… <span className="vendas-verde">você já fechou.</span>
            </p>
          </div>
        )}
      </section>

      {/* ───────── VEJA POR DENTRO ───────── */}
      <section className="vendas-secao vendas-container vendas-centro">
        <span className="vendas-eyebrow">Na palma da mão</span>
        <h2 className="vendas-h2">Veja por dentro.</h2>
        <GaleriaPrints
          prints={[
            { src: "/vendas/home.png", alt: "Painel de oportunidades" },
            { src: "/vendas/anuncio-copiloto.png", alt: "Parecer do Copiloto" },
            { src: "/vendas/anuncio-referencia-preco.png", alt: "Referência de preço" },
            { src: "/vendas/anuncio-historico-fipe.png", alt: "Histórico da FIPE" },
            { src: "/vendas/bia-parte1-estados.png", alt: "Mapa por estados" },
            { src: "/vendas/bia-parte2-margem-media-top12.png", alt: "Margem média por modelo" },
            { src: "/vendas/bia-parte3-cidades-mais-ativas.png", alt: "Cidades mais ativas" },
            { src: "/vendas/bia-parte4-modelos-mais-disputados.png", alt: "Modelos mais disputados" },
            { src: "/vendas/bia-parte4-modelos-mais-disputados-por-volume.png", alt: "Mais disputados por volume" },
            { src: "/vendas/bia-parte5-alto-padrao-marcas-de-luxo.png", alt: "Alto padrão e luxo" },
            { src: "/vendas/bia-parte6-tendencias.png", alt: "Tendências de mercado" },
          ]}
        />
      </section>

      {/* ───────── QUANTO VALE ───────── */}
      <section className="vendas-secao vendas-container vendas-centro vendas-roi">
        <h2 className="vendas-h2">Quanto vale isso?</h2>
        <p className="vendas-p">
          Encontrar <strong>um único</strong> veículo com R$ 5.000 de margem extra…
        </p>
        <div className="vendas-roi-valores">
          <span>paga anos de assinatura.</span>
        </div>
      </section>

      {/* ───────── OFERTA ───────── */}
      <section className="vendas-secao vendas-container" id="assinar">
        <div className="vendas-plano">
          <div className="vendas-plano-topo">
            <span className="vendas-selo vendas-selo--claro">
              <Gem size={14} strokeWidth={2} /> Repasse Livre PRO
            </span>
            <span className="vendas-plano-badge">Plano Fundadores</span>
          </div>

          <h2 className="vendas-plano-titulo">Torne-se um Fundador do Repasse Livre PRO.</h2>
          <p className="vendas-plano-narrativa">
            Você está entrando na fase inicial da primeira plataforma brasileira de Inteligência Automotiva.
            Durante o lançamento, os primeiros assinantes entram por um valor especial — que fica travado pra você.
          </p>

          <div className="vendas-precos vendas-precos--grande">
            {precoAncora && <span className="vendas-preco-de">De {precoAncora.texto}/mês</span>}
            <div className="vendas-preco-por">
              <strong>{preco.valor}</strong>
              <span>{preco.intervalo}</span>
            </div>
          </div>

          <ContadorOferta variante="inline" />

          <ul className="vendas-plano-inclui">
            {PLANO_INCLUI.map((item) => (
              <li key={item}>
                <Check size={15} strokeWidth={2.6} /> {item}
              </li>
            ))}
          </ul>

          <AcaoAssinatura
            estado={estado}
            rotulo="QUERO MINHA VAGA DE FUNDADOR"
            checkoutUrl={checkoutUrl}
            gerenciarUrl={gerenciarUrl}
          />
          <p className="vendas-garantia">
            <ShieldCheck size={15} strokeWidth={2.2} /> Sem fidelidade. Cancele quando quiser, direto no painel.
          </p>
          {precoAncora && (
            <p className="vendas-plano-oficial">
              Depois do lançamento, novos assinantes entram pelo valor oficial de{" "}
              <strong>{precoAncora.texto}/mês</strong>.
            </p>
          )}

          {whatsappSuporte && <BotaoWhatsappSuporte numero={whatsappSuporte} />}
        </div>
      </section>

      {/* ───────── FAQ (da /planos) ───────── */}
      <section className="vendas-secao vendas-container">
        <h2 className="vendas-h2 vendas-centro">Perguntas frequentes</h2>
        <div className="vendas-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="vendas-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── CTA FINAL (mesmo box da /planos) ───────── */}
      <section className="vendas-container">
        <div className="vendas-cta-final">
          <Clock size={22} strokeWidth={2} />
          <h2>
            Quem compra melhor, <span className="vendas-verde">lucra mais.</span>
          </h2>
          <p>Comece hoje com as condições especiais de lançamento.</p>
          <AcaoAssinatura
            estado={estado}
            rotulo="ACESSAR O REPASSE LIVRE PRO"
            checkoutUrl={checkoutUrl}
            gerenciarUrl={gerenciarUrl}
          />
          <span className="vendas-cta-final-nota">
            <ArrowRight size={13} strokeWidth={2.4} /> Enquanto você lia isto, mais carros entraram abaixo da FIPE.
          </span>
        </div>
      </section>
    </main>
  );
}
