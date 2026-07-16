"use client";

import { useEffect, type CSSProperties } from "react";
import { Gem, Clock, Zap, Bell, Check, X, TrendingDown, BarChart3, LayoutGrid, Compass, Star, ShieldCheck, MessageCircle, ArrowRight, Lock, Store, Code, User, Lightbulb, AlertTriangle } from "lucide-react";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { ExperimenteDemo } from "@/components/ExperimenteDemo";
import { ContadorRelogio, ContadorTexto } from "@/components/ContadorVendas";
import { CarrosselVendas } from "@/components/CarrosselVendas";
import { PixIcon } from "@/components/PixIcon";
import type { OfertaDemo } from "@/lib/ofertaDemo";

export interface DadosVendas {
  variante: "padrao" | "fomo";
  precoValor: string; // "R$ 97"
  precoIntervalo: string; // "/mês"
  precoAncoraTexto: string | null; // "R$ 248"
  descontoPct: number | null;
  kpiAoVivo: number | null;
  ofertaDemo: OfertaDemo | null;
  checkoutUrl: string | null;
  gerenciarUrl: string | null;
  estado: "assinar" | "gerenciar";
  jaPremium: boolean;
  whatsappSuporte: string | null;
  gateway: string | null;
  aviso: "sucesso" | "cancelado" | null;
}

const TIT = "var(--fv-titulo), Poppins, sans-serif";
const CORPO = "var(--fv-corpo), Manrope, sans-serif";
const REVEAL: CSSProperties = { opacity: 0, transform: "translateY(24px)", transition: "opacity .7s ease, transform .7s ease" };
const PAD = "clamp(48px,6vw,80px) clamp(20px,5vw,56px)";

const COPY = {
  padrao: {
    h1a: "Enquanto outros procuram carros, você encontra ",
    h1b: "oportunidades.",
    sub: "O Repasse Livre monitora continuamente os maiores marketplaces do Brasil e identifica oportunidades abaixo da FIPE antes que elas desapareçam — e você economiza tempo, compra melhor e aumenta sua margem.",
    timeline: "Quem compra primeiro normalmente encontrou primeiro.",
    finalSub: "Todos os dias milhares de anúncios entram no mercado. Poucos realmente representam uma oportunidade. O Repasse Livre foi criado para encontrar essas oportunidades antes da maioria.",
  },
  fomo: {
    h1a: "Enquanto o mercado inteiro procura, você já ",
    h1b: "encontrou.",
    sub: "Cada minuto procurando na mão, outro comprador chega antes. O Repasse Livre vigia o mercado por você: o BIA organiza os anúncios, o Copiloto interpreta o contexto e você recebe a oportunidade pronta pra decidir.",
    timeline: "No fim, quem chega primeiro é quem lucra.",
    finalSub: "Todos os dias milhares de anúncios entram no mercado. Poucos realmente valem — e o Repasse Livre encontra esses antes da maioria.",
  },
} as const;

const RADAR_LOGOS = [
  { src: "/vendas/olx-sem-fundo.png", alt: "OLX", h: "clamp(20px,4.4vw,26px)", delay: "0s" },
  { src: "/vendas/logo-webmotors.png", alt: "Webmotors", h: "clamp(16px,3.4vw,20px)", delay: "-6.5s" },
  { src: "/vendas/mercado-livre-logo.png", alt: "Mercado Livre", h: "clamp(20px,4.4vw,26px)", delay: "-13s" },
  { src: "/vendas/logo-facebook.png", alt: "Facebook Marketplace", h: "clamp(18px,3.8vw,22px)", delay: "-19.5s" },
];

const eyebrow: CSSProperties = { font: `700 11px ${CORPO}`, letterSpacing: ".18em", color: "#16A34A", textTransform: "uppercase", marginBottom: 10 };
const eyebrowEsc: CSSProperties = { font: `700 11px ${CORPO}`, letterSpacing: ".2em", color: "#35D07F", textTransform: "uppercase", marginBottom: 14 };

/** Moldura de celular com screenshot. */
function Fone({ src, alt, largura, aspecto = "350 / 708", flutua = false }: { src: string; alt: string; largura: string; aspecto?: string; flutua?: boolean }) {
  return (
    <div style={{ width: largura, padding: 8, background: "linear-gradient(160deg,#22354f,#0F1B2D)", borderRadius: 36, boxShadow: "0 30px 56px -18px rgba(15,27,45,.5)", animation: flutua ? "rl-float 5.6s ease-in-out infinite" : undefined }}>
      <div style={{ position: "relative", borderRadius: 29, overflow: "hidden", background: "#EEF1F4", aspectRatio: aspecto }}>
        <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 54, height: 5, borderRadius: 5, background: "#0F1B2D", zIndex: 3 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
      </div>
    </div>
  );
}

/** CTA intermediário — âncora pro card de oferta (#oferta), pra converter de qualquer altura da página. */
function CTAInline({ rotulo, texto }: { rotulo: string; texto?: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: 36 }}>
      {texto && <div style={{ font: `700 clamp(15px,1.9vw,19px) ${TIT}`, color: "#0F1B2D", letterSpacing: "-.01em", margin: "0 auto 16px", maxWidth: 500, textWrap: "balance" }}>{texto}</div>}
      <a href="#oferta" className="rlv-cta rlv-cta--inline"><Gem size={16} fill="#fff" strokeWidth={0} /> {rotulo}</a>
    </div>
  );
}

export function PaginaVendasSlim({ dados }: { dados: DadosVendas }) {
  const c = COPY[dados.variante];
  const rotuloAssinar = "QUERO TER VANTAGEM AGORA";

  useEffect(() => {
    const countUp = (el: HTMLElement) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const to = parseFloat(el.getAttribute("data-count-to") || "0") || 0;
      const inicio = performance.now();
      const passo = (ts: number) => {
        const prog = Math.min(1, (ts - inicio) / 1500);
        const e = 1 - Math.pow(1 - prog, 3);
        el.textContent = Math.round(to * e).toLocaleString("pt-BR");
        if (prog < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      // Rede de segurança p/ aba em background (rAF pausado).
      setTimeout(() => {
        el.textContent = to.toLocaleString("pt-BR");
      }, 1700);
    };
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          el.style.opacity = "1";
          el.style.transform = "none";
          if (el.hasAttribute("data-count-to")) countUp(el);
          io.unobserve(el);
        });
      },
      { threshold: 0.1 }
    );
    const t1 = setTimeout(() => document.querySelectorAll<HTMLElement>("[data-reveal],[data-count-to]").forEach((el) => io.observe(el)), 40);
    const t2 = setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      document.querySelectorAll<HTMLElement>("[data-count-to]").forEach(countUp);
    }, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      io.disconnect();
    };
  }, []);

  return (
    <div style={{ width: "100%", overflowX: "clip", background: "#EEF1F4" }}>

      {dados.aviso === "sucesso" && (
        <div style={{ background: "#0F7A3D", color: "#fff", padding: "12px clamp(20px,5vw,56px)", font: `600 13px ${CORPO}`, display: "flex", gap: 8, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso PRO libera em instantes — recarregue em alguns segundos se ainda não apareceu.
        </div>
      )}
      {dados.aviso === "cancelado" && (
        <div style={{ background: "#F3F5F8", color: "#566577", padding: "12px clamp(20px,5vw,56px)", font: `600 13px ${CORPO}`, textAlign: "center" }}>Checkout cancelado. Quando quiser, é só voltar e assinar.</div>
      )}

      {/* 1 ── barra de urgência sticky */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", background: "#081410", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "10px clamp(16px,4vw,48px)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px 28px", flexWrap: "wrap" }}>
          <div style={{ lineHeight: 1.1, textAlign: "center" }}>
            {dados.descontoPct != null && <div style={{ font: `800 clamp(18px,2.6vw,26px) ${TIT}`, color: "#35D07F", letterSpacing: "-.01em" }}>HOJE: {dados.descontoPct}% OFF</div>}
            <div style={{ font: `600 10px ${CORPO}`, letterSpacing: ".04em", color: "#7f93a3" }}>Oferta por tempo limitado</div>
          </div>
          <ContadorRelogio />
        </div>
      </div>

      {/* SLIM: hero + "o problema" removidos — o radar/Solução é o topo do conteúdo */}
      {/* 3 ── radar / orbit (topo no slim) */}
      <section data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(700px 500px at 78% 50%,rgba(34,197,94,.14),transparent 62%),linear-gradient(160deg,#0C2417,#07120C)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(32px,4vw,56px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(53,208,127,.12)", border: "1px solid rgba(53,208,127,.28)", color: "#35D07F", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".16em", marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#35D07F", animation: "rl-blink 1.4s infinite" }} /> REPASSE LIVRE → A SOLUÇÃO
            </div>
            <h2 style={{ font: `800 clamp(30px,4.4vw,39px)/1.07 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 16px", textWrap: "balance" }}>
              {c.h1a}<span style={{ color: "#35D07F" }}>{c.h1b}</span>
            </h2>
            <p style={{ font: `500 clamp(15px,1.5vw,16px)/1.6 ${CORPO}`, color: "#A9BBCB", maxWidth: 460, margin: "0 0 20px" }}>OLX, Webmotors, Mercado Livre e Facebook monitorados 24 horas por dia. Quando uma oportunidade aparece, nossa inteligência organiza os dados, o Copiloto interpreta e você decide antes da maioria.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
              {["Sem abrir vários sites", "Sem comparar dezenas de anúncios", "Sem perder tempo"].map((x) => (
                <div key={x} style={{ display: "flex", gap: 10, alignItems: "center", font: `600 14px ${CORPO}`, color: "#D6E2EC" }}>
                  <Check size={15} strokeWidth={3} color="#35D07F" /> {x}
                </div>
              ))}
            </div>
            <div style={{ font: `800 clamp(17px,2.2vw,21px) ${TIT}`, color: "#35D07F", letterSpacing: "-.01em" }}>O mercado inteiro chega até você.</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(53,208,127,.1)", border: "1px solid rgba(53,208,127,.24)", padding: "9px 16px", borderRadius: 999, marginTop: 22 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#35D07F", animation: "rl-blink 1.4s infinite", flex: "none" }} />
              {dados.kpiAoVivo ? (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>Mais de <b data-count-to={dados.kpiAoVivo} style={{ fontWeight: 800, color: "#fff" }}>0</b>+ oportunidades monitoradas agora</span>
              ) : (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>Milhares de oportunidades monitoradas agora</span>
              )}
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", font: `700 11px ${CORPO}`, letterSpacing: ".18em", color: "#5f8a72", textTransform: "uppercase" }}>
              Sincronização 100% nativa <span style={{ color: "#35D07F" }}>·</span> Únicos no Brasil
            </div>
          </div>
          <div style={{ flex: "1 1 360px", minWidth: 290, display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "min(440px,86vw)", aspectRatio: "1" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(53,208,127,.16)" }} />
              <div style={{ position: "absolute", inset: "15%", borderRadius: "50%", border: "1px solid rgba(53,208,127,.12)" }} />
              <div style={{ position: "absolute", inset: "32%", borderRadius: "50%", border: "1px dashed rgba(53,208,127,.14)" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg, rgba(53,208,127,.28), rgba(53,208,127,.04) 18%, transparent 34%)", animation: "rl-sweep 6s linear infinite", WebkitMask: "radial-gradient(circle, #000 66%, transparent 67%)", mask: "radial-gradient(circle, #000 66%, transparent 67%)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: "34%", height: "34%", borderRadius: "50%", border: "1px solid rgba(53,208,127,.4)", animation: "rl-ping 3s ease-out infinite" }} />
              {RADAR_LOGOS.map((l) => (
                <div key={l.alt} style={{ position: "absolute", inset: 0, animation: "rl-orbit 26s linear infinite", animationDelay: l.delay }}>
                  <div style={{ position: "absolute", top: 0, left: "50%", transform: "translate(-50%,-50%)", animation: "rl-orbit-rev 26s linear infinite", animationDelay: l.delay }}>
                    <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "clamp(42px,10vw,54px)", padding: "0 clamp(12px,2.4vw,16px)", background: "#fff", borderRadius: 14, boxShadow: "0 12px 26px -8px rgba(0,0,0,.5)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.src} alt={l.alt} style={{ height: l.h, width: "auto", display: "block" }} />
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "clamp(96px,22%,132px)", height: "clamp(96px,22%,132px)", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "rl-corepulse 3s ease-in-out infinite", zIndex: 3 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/vendas/logo-radar.png" alt="Repasse Livre" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 ── timeline */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: PAD }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ font: `700 11px ${CORPO}`, letterSpacing: ".2em", color: "#16A34A", textTransform: "uppercase", marginBottom: 12 }}>Como funciona</div>
            <h2 style={{ font: `800 clamp(24px,3.4vw,34px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>{c.timeline}</h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 38 }}>
            <div style={{ position: "absolute", left: 12, top: 6, bottom: 6, width: 2, background: "linear-gradient(#16A34A,#cbe8d5)" }} />
            {[
              { n: "1", esc: false, t: "Uma oportunidade entra no mercado", s: "O anúncio é publicado abaixo da FIPE. A janela abre." },
              { n: "2", esc: false, t: "O Repasse Livre identifica em segundos", s: "Preço, FIPE, versão, mercado, região e contexto — tudo analisado automaticamente." },
              { n: "3", esc: false, t: "O Copiloto interpreta", s: "Você sabe imediatamente se aquela oportunidade merece sua atenção." },
              { n: "4", esc: true, t: "Você decide antes da maioria", s: <>Enquanto outros ainda pesquisam, você já está negociando. <b style={{ color: "#16A34A" }}>O mercado recompensa quem chega primeiro.</b></> },
            ].map((p, i, arr) => (
              <div key={p.n} style={{ position: "relative", marginBottom: i < arr.length - 1 ? 26 : 0 }}>
                <span style={{ position: "absolute", left: -38, top: 0, width: 26, height: 26, borderRadius: "50%", background: p.esc ? "#0F1B2D" : "#16A34A", color: p.esc ? "#35D07F" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 12px ${TIT}` }}>{p.n}</span>
                <div style={{ font: `700 clamp(15px,1.7vw,17px) ${CORPO}`, color: "#0F1B2D" }}>{p.t}</div>
                <div style={{ font: `500 14px/1.55 ${CORPO}`, color: "#6A7686" }}>{p.s}</div>
              </div>
            ))}
          </div>
          <CTAInline rotulo="QUERO TER VANTAGEM NO MERCADO" />
        </div>
      </section>

      {/* 5 ── comparativo VS */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: PAD }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={eyebrow}>Comparativo</div>
            <h3 style={{ font: `800 clamp(24px,3.4vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>Existem duas formas de comprar.</h3>
          </div>
          <div className="pv-vert" style={{ gap: 16 }}>
            <div className="pv-vert-box" style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#FEF5F4,#FDECEA)", border: "1px solid #F3D3CF", borderRadius: 20, padding: "26px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
                <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: "#F7D7D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9463E" }}><Clock size={22} strokeWidth={2} /></span>
                <div>
                  <div style={{ font: `800 10px ${CORPO}`, letterSpacing: ".12em", color: "#C97a74", textTransform: "uppercase" }}>O jeito antigo</div>
                  <div style={{ font: `800 clamp(16px,2vw,18px) ${TIT}`, color: "#C0392E" }}>Sem o Repasse Livre</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
                {["Abrir OLX, Mercado Livre, Webmotors", "Pesquisar e comparar preços na mão", "Consultar a FIPE de cada um", "Analisar anúncio por anúncio"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 14px ${CORPO}`, color: "#8a5d59" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#F7D7D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9463E" }}><X size={11} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#F9DAD6", borderRadius: 12, padding: "11px 14px", font: `700 12.5px ${CORPO}`, color: "#C0392E" }}><AlertTriangle size={15} strokeWidth={2.2} style={{ flex: "none" }} /> Quando você termina, o carro já foi vendido.</div>
            </div>

            <span style={{ flex: "0 0 auto", width: 52, height: 52, borderRadius: "50%", background: "#0F1B2D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 16px ${TIT}`, boxShadow: "0 12px 26px -8px rgba(15,27,45,.6)", border: "4px solid #EEF1F4" }}>VS</span>

            <div className="pv-vert-box" style={{ flex: "1 1 300px", position: "relative", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#F1FBF5,#E6F7EC)", border: "2px solid #16A34A", borderRadius: 20, padding: "26px 24px", boxShadow: "0 22px 46px -18px rgba(22,163,74,.5)" }}>
              <span style={{ position: "absolute", top: -11, right: 18, background: "#16A34A", color: "#fff", font: `800 9px ${CORPO}`, letterSpacing: ".12em", padding: "5px 11px", borderRadius: 999, boxShadow: "0 6px 14px -4px rgba(22,163,74,.6)" }}>RECOMENDADO</span>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
                <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 8px 18px -6px rgba(22,163,74,.7)" }}><Zap size={21} fill="#fff" strokeWidth={0} /></span>
                <div>
                  <div style={{ font: `800 10px ${CORPO}`, letterSpacing: ".12em", color: "#5F9E77", textTransform: "uppercase" }}>O jeito Repasse Livre</div>
                  <div style={{ font: `800 clamp(16px,2vw,18px) ${TIT}`, color: "#0F7A3D" }}>Com o Repasse Livre</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
                {["Mercado monitorado automaticamente", "Copiloto analisa cada anúncio", "Inteligência compara com o mercado", "Você recebe só o que merece atenção"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 14px ${CORPO}`, color: "#2f6446" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={12} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#16A34A", borderRadius: 12, padding: "11px 14px", font: `800 12.5px ${CORPO}`, color: "#fff" }}><Zap size={15} fill="#fff" strokeWidth={0} style={{ flex: "none" }} /> Você chega primeiro e compra melhor.</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 28, maxWidth: 600, marginInline: "auto", font: `800 clamp(18px,2.4vw,24px)/1.3 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", textWrap: "balance" }}>Enquanto outros procuram informações, <span style={{ color: "#16A34A" }}>você toma decisões.</span></div>
          <CTAInline rotulo="QUERO CHEGAR PRIMEIRO" />
        </div>
      </section>

      {/* 6 ── demonstração (demo real) */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,48px)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={eyebrow}>Demonstração</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>Abra uma oportunidade real e veja o Copiloto trabalhar.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 12px" }}>Esta é uma oportunidade verdadeira. Veja como um anúncio comum ganha contexto quando passa pelo Repasse Livre — <b style={{ color: "#0F1B2D" }}>preço, margem, FIPE, comparativos, Score e análise.</b> Tudo pronto para você decidir.</p>
            <p style={{ font: `700 16px/1.5 ${TIT}`, color: "#0F1B2D", margin: "0 0 18px" }}>Todo mundo vê o anúncio. <span style={{ color: "#16A34A" }}>Só os assinantes enxergam o contexto.</span></p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Sem cadastro", "Análise completa", "Oferta real de hoje"].map((x) => (
                <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F4FBF6", border: "1px solid #D8EEDF", borderRadius: 999, padding: "7px 13px", font: `700 12px ${CORPO}`, color: "#2f6446" }}>
                  <Check size={12} strokeWidth={3} color="#16A34A" /> {x}
                </span>
              ))}
            </div>
          </div>
          {dados.ofertaDemo && (
            <div style={{ flex: "0 1 320px", minWidth: 280, width: "100%", maxWidth: 340 }}>
              <ExperimenteDemo oferta={dados.ofertaDemo} />
            </div>
          )}
        </div>
      </section>

      {/* 7 ── features + celular */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,52px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 380px", minWidth: 280 }}>
            <div style={eyebrow}>O que você desbloqueia</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 22px" }}>Tudo para comprar melhor.</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px 24px" }}>
              {[
                { Ic: LayoutGrid, t: "BIA (nossa IA)", s: "Organiza milhares de anúncios em inteligência de mercado" },
                { Ic: Compass, t: "Copiloto", s: "Analisa automaticamente cada oportunidade" },
                { Ic: BarChart3, t: "Comparativos", s: "Cidade, estado e Brasil — onde o veículo se posiciona" },
                { Ic: Bell, t: "Alertas", s: "Receba oportunidades antes da maioria" },
                { Ic: Star, t: "Score Repasse Livre", s: "Saiba rapidamente quais anúncios merecem atenção" },
                { Ic: TrendingDown, t: "Dashboard", s: "Entenda o mercado antes da concorrência" },
              ].map(({ Ic, t, s }) => (
                <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flex: "none", width: 36, height: 36, borderRadius: 10, background: "rgba(22,163,74,.12)", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={18} strokeWidth={2} /></span>
                  <div>
                    <div style={{ font: `700 14px ${CORPO}`, color: "#0F1B2D" }}>{t}</div>
                    <div style={{ font: `500 13px ${CORPO}`, color: "#8090a0" }}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#fff", border: "1px solid #E4EAF0", borderRadius: 14, font: `800 clamp(15px,1.8vw,18px) ${TIT}`, color: "#0F1B2D", letterSpacing: "-.01em" }}>
              Você deixa de analisar anúncios. <span style={{ color: "#16A34A" }}>Passa a analisar o mercado.</span>
            </div>
          </div>
          <div style={{ flex: "1 1 260px", minWidth: 240, display: "flex", justifyContent: "center" }}>
            <Fone src="/vendas/anuncio-copiloto.png" alt="Análise do Copiloto" largura="min(230px,64vw)" />
          </div>
          <div style={{ flexBasis: "100%" }}>
            <CTAInline rotulo="QUERO ACESSAR AGORA" />
          </div>
        </div>
      </section>

      {/* 8 ── 08:12 */}
      <section data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#F4FBF6,#E7F5EC)" }}>
        <div style={{ position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,.2),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", padding: "clamp(44px,5.5vw,76px) clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,48px)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "0 1 240px", minWidth: 210, display: "flex", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <Fone src="/vendas/home.png" alt="Oportunidade abaixo da FIPE" largura="min(210px,60vw)" aspecto="350 / 712" flutua />
              <div style={{ position: "absolute", top: 26, right: -18, zIndex: 5, display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E4EAF0", borderRadius: 14, padding: "9px 12px", boxShadow: "0 16px 34px -12px rgba(15,27,45,.4)", animation: "rl-float 4.4s ease-in-out infinite" }}>
                <span style={{ flex: "none", width: 30, height: 30, borderRadius: 9, background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: "#fff" }}>
                  <Bell size={15} strokeWidth={2} />
                  <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: "#DD6B36", border: "2px solid #fff", animation: "rl-blink 1.4s infinite" }} />
                </span>
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ font: `800 11px ${CORPO}`, color: "#0F1B2D" }}>Nova oportunidade</div>
                  <div style={{ font: `700 10px ${CORPO}`, color: "#16A34A" }}>21% abaixo da FIPE</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(22,163,74,.1)", border: "1px solid rgba(22,163,74,.22)", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", animation: "rl-blink 1.4s infinite" }} />
              <span style={{ font: `800 10px ${CORPO}`, letterSpacing: ".14em", color: "#0F7A3D" }}>ALERTAS</span>
            </div>
            <h3 style={{ font: `800 clamp(23px,3vw,30px)/1.18 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>Seu celular vibra antes da concorrência.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Enquanto milhares de compradores ainda estão pesquisando, você já recebeu o alerta, já viu a análise e já sabe se vale a pena comprar.</p>
            <p style={{ font: `700 16px/1.5 ${TIT}`, color: "#0F1B2D", margin: 0 }}>As melhores oportunidades aparecem primeiro <span style={{ color: "#16A34A" }}>para quem está preparado.</span></p>
          </div>
          <div style={{ flexBasis: "100%" }}>
            <CTAInline rotulo="QUERO RECEBER OS ALERTAS" />
          </div>
        </div>
      </section>

      {/* SLIM: seção "dashboard showcase" (Inteligência de estoque) removida */}

      {/* 10 ── tendências */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,48px)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={eyebrow}>Inteligência de mercado</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 12px" }}>Pare de analisar anúncios. Comece a analisar o mercado.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 20px" }}>Veja quais modelos estão mais disputados, quais regiões oferecem melhores oportunidades, a margem média por modelo e quais veículos estão abaixo do comportamento normal do mercado. Tudo baseado em dados reais monitorados diariamente.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px", background: "#F7FAFC", border: "1px solid #EAEEF3", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#16A34A" }} />
                  <span style={{ font: `800 13px ${TIT}`, color: "#0F1B2D" }}>Compass</span>
                  <span style={{ font: `600 10px ${CORPO}`, color: "#9AA6B4" }}>Jeep</span>
                </div>
                <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".08em", color: "#9AA6B4", textTransform: "uppercase", marginBottom: 3 }}>Margem média</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ font: `800 16px ${TIT}`, color: "#0F1B2D" }}>9.3%→10.6%</span>
                  <span style={{ font: `800 11px ${CORPO}`, color: "#16A34A" }}>▲ 1.3pp</span>
                </div>
              </div>
              <div style={{ flex: "1 1 160px", background: "#F7FAFC", border: "1px solid #EAEEF3", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E0A800" }} />
                  <span style={{ font: `800 13px ${TIT}`, color: "#0F1B2D" }}>Onix</span>
                  <span style={{ font: `600 10px ${CORPO}`, color: "#9AA6B4" }}>Chevrolet</span>
                </div>
                <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".08em", color: "#9AA6B4", textTransform: "uppercase", marginBottom: 3 }}>Oferta média</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ font: `800 16px ${TIT}`, color: "#0F1B2D" }}>98→79 un.</span>
                  <span style={{ font: `800 11px ${CORPO}`, color: "#DD6B36" }}>▼ 19%</span>
                </div>
              </div>
            </div>
            <p style={{ font: `600 13px/1.5 ${CORPO}`, color: "#7A8698", margin: "16px 0 0" }}>↳ Quem entende o mercado compra melhor: quando a oportunidade aparece, o desconto está mais gordo — <b style={{ color: "#16A34A" }}>vale agir rápido.</b></p>
          </div>
          <div style={{ flex: "0 1 240px", minWidth: 210, display: "flex", justifyContent: "center" }}>
            <Fone src="/vendas/bia-parte6-tendencias.png" alt="Tendências do mês" largura="min(220px,62vw)" flutua />
          </div>
          <div style={{ flexBasis: "100%" }}>
            <CTAInline rotulo="QUERO TER VANTAGEM NO MERCADO" />
          </div>
        </div>
      </section>

      {/* 11 ── "Veja por dentro" slider */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: PAD }}>
          <div style={{ marginBottom: 24 }}>
            <div style={eyebrow}>Na palma da mão</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px) ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>Veja por dentro.</h3>
          </div>
          <CarrosselVendas
            largura={190}
            imagens={[
              { src: "/vendas/home.png", alt: "Painel Repasse Livre" },
              { src: "/vendas/anuncio-referencia-preco.png", alt: "Referência de preço do anúncio" },
              { src: "/vendas/anuncio-historico-fipe.png", alt: "Histórico da FIPE" },
              { src: "/vendas/anuncio-copiloto.png", alt: "Análise do Copiloto" },
              { src: "/vendas/bia-parte1-estados.png", alt: "Oportunidades por estado" },
              { src: "/vendas/bia-parte2-margem-media-top12.png", alt: "Margem média — top 12 modelos" },
              { src: "/vendas/bia-parte3-cidades-mais-ativas.png", alt: "Cidades mais ativas" },
              { src: "/vendas/bia-parte4-modelos-mais-disputados.png", alt: "Modelos mais disputados" },
              { src: "/vendas/bia-parte4-modelos-mais-disputados-por-volume.png", alt: "Mais disputados por volume" },
              { src: "/vendas/bia-parte4-modelos-mais-disputados-por-marca-volks.png", alt: "Mais disputados por marca" },
              { src: "/vendas/bia-parte5-alto-padrao-marcas-de-luxo.png", alt: "Alto padrão — marcas de luxo" },
              { src: "/vendas/bia-parte6-tendencias.png", alt: "Tendências do mês" },
            ]}
          />
          <CTAInline texto="Tudo isso na palma da sua mão, todo dia." rotulo="QUERO ACESSAR AGORA" />
        </div>
      </section>

      {/* 13 ── quanto vale (equação) */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", textAlign: "center" }}>
          <div style={eyebrow}>O retorno</div>
          <h3 style={{ font: `800 clamp(24px,3.4vw,34px) ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 12px" }}>Quanto vale uma boa decisão?</h3>
          <p style={{ font: `500 clamp(15px,1.6vw,17px) ${CORPO}`, color: "#6A7686", maxWidth: 560, margin: "0 auto 32px" }}>Imagine encontrar apenas <b style={{ color: "#0F1B2D" }}>um único</b> veículo que gere R$ 5.000 de margem adicional. Agora compare isso com o preço do seu acesso.</p>
          <div className="pv-vert" style={{ gap: "clamp(14px,2vw,22px)" }}>
            <div className="pv-vert-box" style={{ flex: "1 1 280px", maxWidth: 360, background: "#F7FAFC", border: "1px solid #E4EAF0", borderRadius: 20, padding: "26px 24px", boxShadow: "0 20px 44px -22px rgba(15,27,45,.3)" }}>
              <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".14em", color: "#9AA6B4", textTransform: "uppercase", marginBottom: 8 }}>1 oportunidade abaixo da FIPE</div>
              <div style={{ font: `800 clamp(30px,4.5vw,40px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>+ R$ 5.000</div>
              <div style={{ font: `600 13px ${CORPO}`, color: "#6A7686", marginTop: 4 }}>de margem no seu bolso</div>
            </div>
            <div style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", background: "#0F1B2D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 22px ${TIT}` }}>=</div>
            <div className="pv-vert-box" style={{ flex: "1 1 280px", maxWidth: 360, background: "#0F1B2D", borderRadius: 20, padding: "26px 24px", boxShadow: "0 20px 44px -20px rgba(15,27,45,.5)" }}>
              <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".14em", color: "#5f8a72", textTransform: "uppercase", marginBottom: 8 }}>Repasse Livre PRO</div>
              <div style={{ font: `800 clamp(30px,4.5vw,40px) ${TIT}`, color: "#fff", letterSpacing: "-.02em" }}>
                {dados.precoValor}
                <span style={{ fontSize: ".5em", color: "#A9BBCB", fontWeight: 700 }}>{dados.precoIntervalo}</span>
              </div>
              <div style={{ font: `600 13px ${CORPO}`, color: "#9FB0C4", marginTop: 4 }}>acesso completo à plataforma</div>
            </div>
          </div>
          <div style={{ marginTop: 32, font: `800 clamp(22px,3.4vw,32px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>Um bom negócio pode pagar anos de Repasse Livre PRO.</div>
          <CTAInline rotulo="QUERO ACESSAR O REPASSE LIVRE PRO" />
        </div>
      </section>

      {/* 13b ── para quem é */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: PAD, textAlign: "center" }}>
          <div style={eyebrow}>Para quem é</div>
          <h3 style={{ font: `800 clamp(24px,3.4vw,32px)/1.16 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px", textWrap: "balance" }}>
            Feito para quem compra veículos de forma estratégica.
          </h3>
          <p style={{ font: `500 clamp(15px,1.6vw,17px)/1.6 ${CORPO}`, color: "#6A7686", maxWidth: 560, margin: "0 auto 34px" }}>
            Se a sua margem depende de comprar bem e na hora certa, o Repasse Livre PRO foi desenhado para você.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, maxWidth: 720, margin: "0 auto 26px" }}>
            {[
              { Ic: Store, t: "Lojistas", dark: false },
              { Ic: Code, t: "Intermediadores", dark: false },
              { Ic: BarChart3, t: "Investidores", dark: false },
              { Ic: ArrowRight, t: "Repassadores", dark: false },
              { Ic: User, t: "Compradores profissionais", dark: false },
              { Ic: Lightbulb, t: "Quem entende que informação gera margem", dark: true },
            ].map(({ Ic, t, dark }) => (
              <div key={t} style={{ background: dark ? "#0F1B2D" : "#fff", border: `1px solid ${dark ? "#0F1B2D" : "#E4EAF0"}`, borderRadius: 16, padding: "20px 16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: dark ? "rgba(53,208,127,.18)" : "rgba(22,163,74,.12)", color: dark ? "#35D07F" : "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Ic size={20} strokeWidth={2} /></div>
                <div style={{ font: `700 ${dark ? "13px" : "14px"} ${CORPO}`, color: dark ? "#fff" : "#0F1B2D" }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13c ── banda escura "o que você está comprando" */}
      <section data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(600px 300px at 50% -20px,rgba(34,197,94,.18),transparent 65%),linear-gradient(165deg,#0E2A1A,#081410)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "clamp(44px,5.5vw,76px) clamp(20px,5vw,56px)", textAlign: "center" }}>
          <div style={eyebrowEsc}>O que você está comprando</div>
          <h3 style={{ font: `800 clamp(22px,3vw,28px)/1.2 ${TIT}`, color: "#fff", margin: "0 0 6px" }}>Você não está comprando acesso a anúncios.</h3>
          <p style={{ font: `500 14px ${CORPO}`, color: "#9FB0C4", margin: "0 0 20px" }}>Você está investindo em:</p>
          <div style={{ font: `800 clamp(22px,3.2vw,30px)/1.4 ${TIT}`, color: "#35D07F", letterSpacing: "-.01em" }}>Tempo. Informação. Contexto. Inteligência. Velocidade. Margem. <span style={{ color: "#fff" }}>Decisões melhores.</span></div>
          <div style={{ marginTop: 22, font: `700 clamp(15px,1.8vw,18px) ${TIT}`, color: "#CDE9D6" }}>Quanto melhor a decisão, maior a margem.</div>
        </div>
      </section>

      {/* 14 ── card de oferta (escuro) */}
      <section id="oferta" data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", scrollMarginTop: 70, background: "radial-gradient(700px 360px at 78% -20px,rgba(34,197,94,.2),transparent 60%),linear-gradient(165deg,#0E2A1A,#081410)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(32px,4vw,56px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 380px", minWidth: 290 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(53,208,127,.14)", color: "#35D07F", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}><Gem size={11} fill="#35D07F" strokeWidth={0} /> REPASSE LIVRE PRO</span>
              <span style={{ background: "rgba(217,119,46,.2)", color: "#F0A868", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}>SEMANA DO COMPRADOR</span>
            </div>
            <h3 style={{ font: `800 clamp(26px,3.6vw,38px)/1.14 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 14px", textWrap: "balance" }}>Repasse Livre PRO</h3>
            <p style={{ font: `500 clamp(14px,1.5vw,16px)/1.6 ${CORPO}`, color: "#9FB0C4", maxWidth: 460, margin: "0 0 24px" }}>Tudo o que você precisa para encontrar oportunidades antes da concorrência. Comece hoje pelas condições especiais da Semana do Comprador — antes de o valor voltar ao normal.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {[
                <>Acesso total: <b style={{ color: "#fff" }}>BIA, Copiloto, Dashboard, Alertas, Comparativos e Score</b></>,
                <>Todas as melhorias da plataforma <b style={{ color: "#fff" }}>incluídas</b></>,
                <>Sem fidelidade — cancele quando quiser, direto no painel</>,
              ].map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flex: "none", width: 24, height: 24, borderRadius: "50%", background: "rgba(53,208,127,.16)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}><Check size={13} strokeWidth={3} color="#35D07F" /></span>
                  <span style={{ font: `600 14.5px/1.5 ${CORPO}`, color: "#D6E2EC" }}>{n}</span>
                </div>
              ))}
            </div>
            {dados.precoAncoraTexto && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(221,107,54,.14)", border: "1px solid rgba(240,168,104,.3)", color: "#F0A868", padding: "10px 15px", borderRadius: 12, font: `700 12.5px ${CORPO}` }}>
                <Lock size={15} strokeWidth={2.2} /> Oferta por tempo limitado — depois o valor volta pra {dados.precoAncoraTexto}/mês.
              </div>
            )}
          </div>
          <div style={{ flex: "0 1 400px", minWidth: 300 }}>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "clamp(26px,4vw,34px) clamp(22px,3vw,30px)", boxShadow: "0 30px 70px -22px rgba(0,0,0,.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
              <div style={{ textAlign: "center", font: `700 10px ${CORPO}`, letterSpacing: ".16em", color: "#5f8a72", textTransform: "uppercase", marginBottom: 8 }}>Semana do Comprador</div>
              {dados.precoAncoraTexto && <div style={{ textAlign: "center", font: `600 13px ${CORPO}`, color: "#7f93a3", textDecoration: "line-through" }}>De {dados.precoAncoraTexto}/mês</div>}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5, margin: "4px 0 8px" }}>
                <span style={{ font: `800 clamp(48px,7vw,60px)/1 ${TIT}`, color: "#fff", letterSpacing: "-.03em" }}>{dados.precoValor}</span>
                <span style={{ font: `700 18px ${TIT}`, color: "#A9BBCB" }}>{dados.precoIntervalo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, margin: "0 0 18px", font: `700 12.5px ${CORPO}`, color: "#CDE9D6" }}>
                <PixIcon size={15} /> Pagamento facilitado por PIX
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(221,107,54,.16)", color: "#F0A868", padding: "10px 14px", borderRadius: 12, font: `700 13px ${CORPO}`, marginBottom: 22 }}>
                <Clock size={14} strokeWidth={2.2} /> Sua oferta expira em <ContadorTexto />
              </div>
              <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : rotuloAssinar} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} gateway={dados.gateway} className="rlv-cta" />
              <div style={{ textAlign: "center", marginTop: 14, font: `600 12px ${CORPO}`, color: "#8fa2b3", display: "flex", gap: 7, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}><ShieldCheck size={14} strokeWidth={2} color="#35D07F" /> Sem fidelidade. Cancele quando quiser.</div>
              {dados.precoAncoraTexto && <div style={{ textAlign: "center", marginTop: 8, font: `500 12px ${CORPO}`, color: "#7f93a3" }}>Quando a oferta acabar, novos assinantes entram por <b style={{ color: "#A9BBCB" }}>{dados.precoAncoraTexto}/mês</b> — o seu fica travado.</div>}
              {dados.whatsappSuporte && (
                <a href={`https://wa.me/${dados.whatsappSuporte}?text=${encodeURIComponent("Olá! Fiquei com uma dúvida sobre o Repasse Livre PRO.")}`} target="_blank" rel="noreferrer" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(53,208,127,.14)", color: "#35D07F", padding: 12, borderRadius: 12, font: `700 13px ${CORPO}` }}>
                  <MessageCircle size={16} strokeWidth={2} fill="#35D07F" /> Ficou com dúvida? Chame no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 15 ── FAQ */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: PAD }}>
          <h3 style={{ font: `800 clamp(24px,3.2vw,30px) ${TIT}`, color: "#0F1B2D", textAlign: "center", margin: "0 0 26px" }}>Perguntas frequentes</h3>
          {[
            { q: "O Repasse Livre vende veículos?", a: "Não. Monitoramos oportunidades publicadas nos principais marketplaces do Brasil — OLX, Webmotors, Mercado Livre e Facebook — e transformamos esses anúncios em inteligência de mercado." },
            { q: "O que é o BIA?", a: "É o Banco de Inteligência Automotiva do Repasse Livre. Ele organiza, compara e interpreta milhares de anúncios para gerar inteligência que apoia a sua decisão." },
            { q: "O que é o Copiloto?", a: "É a tecnologia que analisa cada oportunidade usando os dados do BIA e apresenta uma recomendação baseada no contexto de mercado." },
            { q: "Os anúncios são do Repasse Livre?", a: "Não. Os anúncios são monitorados em diferentes marketplaces e enriquecidos com a inteligência exclusiva do Repasse Livre." },
            { q: "Quem pode utilizar?", a: "Qualquer pessoa que queira comprar melhor, economizar tempo e tomar decisões com mais informação." },
          ].map(({ q, a }) => (
            <details key={q} style={{ background: "#F7FAFC", border: "1px solid #EAEEF3", borderRadius: 16, padding: "18px 22px", marginBottom: 12 }}>
              <summary style={{ cursor: "pointer", listStyle: "none", font: `700 clamp(14px,1.6vw,16px) ${CORPO}`, color: "#0F1B2D" }}>{q}</summary>
              <p style={{ font: `500 14px/1.6 ${CORPO}`, color: "#6A7686", margin: "12px 0 0" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 16 ── CTA final */}
      <section style={{ width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(700px 320px at 50% 0,rgba(34,197,94,.22),transparent 70%),linear-gradient(180deg,#0E2A1A,#081410)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", textAlign: "center" }}>
          <div style={eyebrowEsc}>Última chamada</div>
          <h3 style={{ font: `800 clamp(24px,3.6vw,34px)/1.16 ${TIT}`, color: "#fff", margin: "0 0 14px", letterSpacing: "-.02em", textWrap: "balance" }}>Enquanto outros ainda estão procurando, você pode estar <span style={{ color: "#35D07F" }}>fechando o próximo negócio.</span></h3>
          <p style={{ font: `500 clamp(14px,1.5vw,16px)/1.6 ${CORPO}`, color: "#9FB0C4", margin: "0 0 22px", maxWidth: 560, marginInline: "auto" }}>{c.finalSub}</p>
          <div style={{ font: `800 clamp(17px,2.2vw,21px) ${TIT}`, color: "#CDE9D6", margin: "0 0 28px", letterSpacing: "-.01em" }}>Encontre oportunidades. Compre melhor. Aumente sua margem.</div>
          <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : "QUERO TER VANTAGEM NO MERCADO"} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} gateway={dados.gateway} className="rlv-cta rlv-cta--inline" />
          <div style={{ marginTop: 18, font: `500 12px ${CORPO}`, color: "#6f8598" }}>→ Enquanto você lia isto, mais carros entraram abaixo da FIPE.</div>
        </div>
      </section>

    </div>
  );
}
