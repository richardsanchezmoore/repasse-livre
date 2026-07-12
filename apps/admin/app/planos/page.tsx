import type { Metadata } from "next";
import {
  Gem,
  Check,
  ArrowRight,
  TrendingDown,
  Clock,
  Star,
  ShieldCheck,
  Search,
  Zap,
} from "lucide-react";
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

export const metadata: Metadata = {
  title: "Repasse Livre PRO — inteligência de mercado pra comprar abaixo da FIPE",
  description:
    "Enquanto o mercado procura carros, os assinantes do Repasse Livre encontram oportunidades. O BIA monitora milhares de anúncios de OLX, Webmotors e Mercado Livre, identifica o que está abaixo da FIPE e entrega análise pra você comprar melhor e lucrar mais.",
};

// Formata centavos em BRL, tirando o ",00" quando redondo.
function brl(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(centavos / 100)
    .replace(/,00$/, "");
}

const PLATAFORMAS = [
  { nome: "OLX", logo: "/vendas/logos/olx.png", ativa: true },
  { nome: "Webmotors", logo: "/vendas/logos/webmotors.png", ativa: true },
  { nome: "Mercado Livre", logo: "/vendas/logos/mercadolivre.png", ativa: true },
  { nome: "Facebook Marketplace", logo: "/vendas/logos/facebook.png", ativa: false },
];

const DIFERENCIAL = [
  "FIPE",
  "Preço médio do mercado",
  "Histórico do anúncio",
  "Comparação regional",
  "Percentual abaixo da FIPE",
  "Posição entre anúncios semelhantes",
  "Dados estatísticos do mercado",
];

const PERSONAS = [
  "Lojistas",
  "Investidores",
  "Repassadores",
  "Compradores Profissionais",
  "Intermediadores",
  "Quem compra para revender",
  "Quem quer comprar pagando menos",
];

const COMPARATIVO: [string, string][] = [
  ["Procurar em vários sites", "Tudo reunido em um só lugar"],
  ["Comparar preços manualmente", "Comparação automática"],
  ["Descobrir se está barato", "Score e Copiloto decidem por você"],
  ["Perder horas pesquisando", "Alertas automáticos"],
  ["Comprar na dúvida", "Comprar com inteligência"],
];

const PLANO_INCLUI = [
  "Agregador Nacional",
  "Copiloto de Compra",
  "Score Repasse Livre",
  "Dashboard BIA",
  "Comparativos de mercado",
  "Alertas Inteligentes",
  "Favoritos",
  "Histórico",
];

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

export default async function PlanosPage({
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

  // Checkout da Cakto (quando é o gateway ativo). Logado → leva o user_id no sck
  // (match exato); NÃO logado → checkout direto SEM login (o webhook cria/acha a
  // conta pelo email do comprador). Menos fricção — todos começam agora.
  const checkoutUrl =
    gatewayAtivo === "cakto" && caktoUrl
      ? usuario
        ? `${caktoUrl}${caktoUrl.includes("?") ? "&" : "?"}sck=${usuario.id}`
        : caktoUrl
      : null;
  const gerenciarUrl = whatsappSuporte
    ? `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent("Olá! Quero gerenciar minha assinatura do Repasse Livre PRO.")}`
    : null;

  // Número AO VIVO de oportunidades abaixo da FIPE — arredondado PRA BAIXO (nunca
  // superestima) num múltiplo de 500 pra virar prova social honesta e limpa.
  const abaixoFipeVivo = kpis.abaixoFipe >= 1000 ? Math.floor(kpis.abaixoFipe / 500) * 500 : null;

  // "gerenciar" só pra quem tem assinatura ATIVA (dentro da validade). Cancelado/
  // expirado → "assinar" (pode reassinar); senão o CTA cairia no WhatsApp e o cara
  // ficaria preso sem conseguir voltar a assinar.
  const expiraMs = usuario?.premiumExpiraEm ? new Date(usuario.premiumExpiraEm).getTime() : 0;
  const assinaturaAtiva =
    (usuario?.assinaturaStatus === "active" || usuario?.assinaturaStatus === "trialing") && expiraMs > Date.now();
  // Não-logado NÃO cai mais em "entrar" (criar conta antes): vai direto pro
  // checkout ("assinar"). Só assinatura ativa vira "gerenciar".
  const estado: "entrar" | "assinar" | "gerenciar" = assinaturaAtiva ? "gerenciar" : "assinar";
  const jaPremium = Boolean(usuario?.premium);

  // % OFF do contador — calculado do anchor vs preço real (honesto: 249→99 = 60%).
  const descontoPct =
    precoAncora && precoAncora.centavos > preco.centavos
      ? Math.round((1 - preco.centavos / precoAncora.centavos) * 100)
      : null;

  // Equivalente mensal dos planos mais longos (desconto só de EXIBIÇÃO; a
  // cobrança automática desses ciclos entra quando os preços forem criados no
  // Stripe — hoje o checkout ativo é o mensal).
  const base = preco.centavos;
  const planosLongos = [
    { rotulo: "Trimestral", meses: 3, desc: 10, mes: Math.round(base * 0.9) },
    { rotulo: "Semestral", meses: 6, desc: 20, mes: Math.round(base * 0.8) },
    { rotulo: "Anual", meses: 12, desc: 30, mes: Math.round(base * 0.7) },
  ];

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
            <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso PRO é liberado em instantes —
            se ainda não apareceu, recarregue a página em alguns segundos.
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
          Enquanto o mercado procura carros, você encontra <span>oportunidades</span>.
        </h1>
        <p className="vendas-hero-sub">
          O BIA monitora milhares de anúncios de OLX, Webmotors e Mercado Livre todos os dias e transforma os
          dados do mercado automotivo em decisões mais inteligentes. Menos tempo pesquisando. Mais tempo
          fechando negócios.
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
          rotulo="QUERO SER FUNDADOR"
          checkoutUrl={checkoutUrl}
          gerenciarUrl={gerenciarUrl}
        />
        <p className="planos-cta-nota">
          {jaPremium
            ? "Você já é PRO. Gerencie ou cancele quando quiser."
            : "Sem fidelidade — cancele quando quiser, direto no seu painel."}
        </p>
      </section>

      {/* ───────── COBERTURA / LOGOS ───────── */}
      <section className="vendas-container vendas-cobertura">
        <p className="vendas-cobertura-titulo">Tudo o que está abaixo da FIPE — num lugar só.</p>
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

      {/* ───────── BLOCO 2 — O PROBLEMA ───────── */}
      <section className="vendas-secao vendas-container">
        <span className="vendas-eyebrow">O problema</span>
        <h2 className="vendas-h2">
          Todos os dias, excelentes oportunidades aparecem — e desaparecem antes de você encontrar.
        </h2>
        <p className="vendas-p">
          Enquanto você abre uma aba pra cada portal e compara preço por preço na mão…
        </p>
        <div className="vendas-chips">
          {["OLX", "Mercado Livre", "Webmotors"].map((s) => (
            <span key={s} className="vendas-chip">
              <Search size={14} strokeWidth={2.2} /> {s}
            </span>
          ))}
        </div>
        <p className="vendas-p">
          …outros compradores <strong>já fecharam o melhor negócio</strong>. Você perde horas procurando. E,
          muitas vezes, compra sem saber se era mesmo uma boa oportunidade.
        </p>
      </section>

      {/* ───────── BLOCO 3 — A VIRADA + MOCKUP HOME ───────── */}
      <section className="vendas-secao vendas-split vendas-container">
        <div>
          <span className="vendas-eyebrow">A virada</span>
          <h2 className="vendas-h2">O Repasse Livre faz esse trabalho por você.</h2>
          <p className="vendas-p">
            Nosso BIA monitora continuamente milhares de anúncios e transforma dados em inteligência de
            mercado. Você deixa de <em>procurar carros</em> e passa a <strong>encontrar oportunidades</strong>.
          </p>
        </div>
        <Fone src="/vendas/home.png" alt="Painel do Repasse Livre" />
      </section>

      {/* ───────── BLOCO 5 — O DIFERENCIAL + MOCKUP COPILOTO ───────── */}
      <section className="vendas-secao vendas-split vendas-split--inverso vendas-container">
        <Fone src="/vendas/anuncio-copiloto.png" alt="Parecer do Copiloto de Compra" />
        <div>
          <span className="vendas-eyebrow">O diferencial</span>
          <h2 className="vendas-h2">
            Enquanto outros mostram anúncios, nós mostramos <span className="vendas-verde">inteligência</span>.
          </h2>
          <p className="vendas-p">Em cada oportunidade, o Repasse Livre analisa:</p>
          <ul className="vendas-lista">
            {DIFERENCIAL.map((d) => (
              <li key={d}>
                <Check size={15} strokeWidth={2.6} /> {d}
              </li>
            ))}
          </ul>
          <p className="vendas-p vendas-p--forte">Tudo isso reunido em um único lugar.</p>
        </div>
      </section>

      {/* ───────── BIA SHOWCASE ───────── */}
      <section className="vendas-secao vendas-split vendas-container">
        <div>
          <span className="vendas-eyebrow">Dashboard BIA</span>
          <h2 className="vendas-h2">Você enxerga o mercado como ninguém.</h2>
          <p className="vendas-p">
            Margem média por modelo, os carros mais disputados, o mapa do alto padrão e pra onde o preço de
            cada região está indo — antes da concorrência. O mercado inteiro num painel só.
          </p>
        </div>
        <Fone src="/vendas/bia-parte6-tendencias.png" alt="Tendências de mercado na BIA" />
      </section>

      {/* ───────── GALERIA — VEJA POR DENTRO ───────── */}
      <section className="vendas-secao vendas-container vendas-centro">
        <span className="vendas-eyebrow">Na palma da mão</span>
        <h2 className="vendas-h2">Veja por dentro.</h2>
        <p className="vendas-p">
          Referência de preço, histórico da FIPE, margem por modelo, os mais disputados e o mapa do alto
          padrão — arraste e conheça.
        </p>
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

      {/* ───────── BLOCO 6 — PARA QUEM É ───────── */}
      <section className="vendas-secao vendas-container vendas-centro">
        <span className="vendas-eyebrow">Para quem é</span>
        <h2 className="vendas-h2">Feito pra quem vive do mercado automotivo.</h2>
        <div className="vendas-personas">
          {PERSONAS.map((p) => (
            <span key={p} className="vendas-persona">
              <Check size={15} strokeWidth={2.6} /> {p}
            </span>
          ))}
        </div>
      </section>

      {/* ───────── BLOCO 7 — EXPERIMENTE (PROVA AO VIVO) ───────── */}
      <section className="vendas-secao vendas-container">
        {ofertaDemo ? (
          <div className="vendas-split vendas-split--demo">
            <div>
              <span className="vendas-eyebrow">Experimente agora — sem compromisso</span>
              <h2 className="vendas-h2">Abra uma oferta real e veja o Copiloto trabalhar.</h2>
              <p className="vendas-p">
                Esta é uma oportunidade de verdade, abaixo da FIPE, com o Copiloto e a análise
                <strong> liberados</strong> pra você sentir o produto — sem sair daqui.
              </p>
              <p className="vendas-p vendas-p--forte">
                Enquanto a maioria ainda está procurando… <span className="vendas-verde">você já encontrou.</span>
              </p>
            </div>
            <ExperimenteDemo oferta={ofertaDemo} />
          </div>
        ) : (
          <div className="vendas-centro">
            <span className="vendas-eyebrow">Imagine encontrar isto antes dos outros</span>
            <div className="vendas-oferta-demo">
              <div className="vendas-oferta-demo-topo">
                <TrendingDown size={16} strokeWidth={2.4} /> 14% abaixo da FIPE
              </div>
              <h3>Jeep Compass Longitude 2023</h3>
              <div className="vendas-oferta-demo-estrelas">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                ))}
                <span>Excelente oportunidade</span>
              </div>
              <div className="vendas-oferta-demo-score">
                <span className="vendas-score-num">94</span>
                <span className="vendas-score-txt">
                  Repasse Livre Score
                  <br />
                  <b>Copiloto recomenda contato imediato.</b>
                </span>
              </div>
            </div>
            <p className="vendas-p vendas-p--forte">
              Enquanto a maioria ainda está procurando… <span className="vendas-verde">você já encontrou.</span>
            </p>
          </div>
        )}
      </section>

      {/* ───────── BLOCO 8 — ROI ───────── */}
      <section className="vendas-secao vendas-container vendas-centro vendas-roi">
        <h2 className="vendas-h2">Quanto vale encontrar só um bom negócio por mês?</h2>
        <p className="vendas-p">Se o Repasse Livre te ajudar a economizar ou ganhar</p>
        <div className="vendas-roi-valores">
          <span>R$ 3.000</span>
          <span>R$ 5.000</span>
          <span>R$ 10.000</span>
        </div>
        <p className="vendas-p">
          em um <strong>único veículo</strong>, a assinatura praticamente se paga sozinha.
        </p>
      </section>

      {/* ───────── BLOCO 9 — COMPARATIVO ───────── */}
      <section className="vendas-secao vendas-container">
        <h2 className="vendas-h2 vendas-centro">Do jeito antigo × com o Repasse Livre PRO</h2>
        <div className="vendas-comparativo">
          <div className="vendas-comp-cab">
            <span>Pesquisa tradicional</span>
            <span className="vendas-comp-cab-pro">Repasse Livre PRO</span>
          </div>
          {COMPARATIVO.map(([a, b]) => (
            <div key={a} className="vendas-comp-linha">
              <span className="vendas-comp-ruim">{a}</span>
              <span className="vendas-comp-bom">
                <Check size={15} strokeWidth={2.6} /> {b}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── BLOCO 10 — OFERTA / PREÇO ───────── */}
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

          {/* Descontos de planos mais longos (exibição; cobrança automática em breve) */}
          <div className="vendas-longos">
            <p className="vendas-longos-titulo">
              <Zap size={14} strokeWidth={2.4} /> Economize assinando por mais tempo
            </p>
            <div className="vendas-longos-grid">
              {planosLongos.map((p) => (
                <div key={p.rotulo} className="vendas-longo">
                  <span className="vendas-longo-desc">−{p.desc}%</span>
                  <span className="vendas-longo-nome">{p.rotulo}</span>
                  <span className="vendas-longo-mes">
                    <strong>{brl(p.mes)}</strong>/mês
                  </span>
                  <span className="vendas-longo-total">{brl(p.mes * p.meses)} a cada {p.meses} meses</span>
                </div>
              ))}
            </div>
            {whatsappSuporte && (
              <p className="vendas-longos-nota">
                Quer um plano trimestral, semestral ou anual com desconto? Fale com a gente no WhatsApp abaixo.
              </p>
            )}
          </div>

          {whatsappSuporte && <BotaoWhatsappSuporte numero={whatsappSuporte} />}
        </div>
      </section>

      {/* ───────── BLOCO 11 — FAQ ───────── */}
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

      {/* ───────── CTA FINAL ───────── */}
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
