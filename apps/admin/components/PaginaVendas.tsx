"use client";

import { useEffect, type CSSProperties } from "react";
import { Gem, Clock, Zap, Bell, Check, X, TrendingDown, BarChart3, LayoutGrid, Compass, Star, ShieldCheck, MessageCircle, ArrowRight, Lock } from "lucide-react";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { ExperimenteDemo } from "@/components/ExperimenteDemo";
import { ContadorRelogio, ContadorTexto } from "@/components/ContadorVendas";
import { CarrosselVendas } from "@/components/CarrosselVendas";
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
    sub: "O BIA monitora milhares de anúncios dos principais marketplaces do Brasil, identifica o que está abaixo da FIPE e entrega inteligência pronta — pra quem compra primeiro.",
    timeline: "Quem compra primeiro é quem encontrou primeiro.",
    finalSub: "Garanta hoje o valor promocional e trave ele pra sempre.",
  },
  fomo: {
    h1a: "Enquanto o mercado inteiro procura, você já ",
    h1b: "encontrou.",
    sub: "Cada minuto procurando na mão, outro comprador chega antes. O BIA vigia o mercado por você e entrega a oportunidade pronta — com o Copiloto já analisado. Você só chega e fecha.",
    timeline: "No fim, quem chega primeiro é quem lucra.",
    finalSub: "Quem chega primeiro leva. Trave o valor promocional agora.",
  },
} as const;

const RADAR_LOGOS = [
  { src: "/vendas/olx-sem-fundo.png", alt: "OLX", h: "clamp(20px,4.4vw,26px)", delay: "0s" },
  { src: "/vendas/logo-webmotors.png", alt: "Webmotors", h: "clamp(16px,3.4vw,20px)", delay: "-6.5s" },
  { src: "/vendas/mercado-livre-logo.png", alt: "Mercado Livre", h: "clamp(20px,4.4vw,26px)", delay: "-13s" },
  { src: "/vendas/logo-facebook.png", alt: "Facebook Marketplace", h: "clamp(18px,3.8vw,22px)", delay: "-19.5s", breve: true },
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

export function PaginaVendas({ dados }: { dados: DadosVendas }) {
  const c = COPY[dados.variante];
  const rotuloAssinar = `QUERO TRAVAR ${dados.precoValor}/MÊS`;

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
    <div style={{ width: "100%", overflow: "hidden", background: "#EEF1F4" }}>

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
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "10px clamp(16px,4vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ lineHeight: 1.15 }}>
            {dados.descontoPct != null && <div style={{ font: `800 clamp(12px,1.6vw,14px) ${CORPO}`, color: "#35D07F" }}>HOJE: {dados.descontoPct}% OFF</div>}
            <div style={{ font: `600 10px ${CORPO}`, letterSpacing: ".04em", color: "#7f93a3" }}>Oferta por tempo limitado</div>
          </div>
          <ContadorRelogio />
        </div>
      </div>

      {/* 2 ── hero (full-bleed, 2 col) */}
      <section style={{ width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(900px 500px at 82% 10%,rgba(34,197,94,.20),transparent 60%),linear-gradient(165deg,#0E2A1A 0%,#0A1C13 55%,#081410 100%)" }}>
        <div style={{ position: "absolute", top: 40, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(53,208,127,.22),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "clamp(40px,5vw,72px) clamp(20px,5vw,56px) clamp(48px,6vw,80px)", display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,56px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 400px", minWidth: 290 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(53,208,127,.12)", color: "#35D07F", border: "1px solid rgba(53,208,127,.3)", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".14em", marginBottom: 22 }}>
              <Gem size={12} fill="#35D07F" strokeWidth={0} /> REPASSE LIVRE PRO
            </div>
            <h1 style={{ font: `800 clamp(30px,4.4vw,50px)/1.07 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 18px", textWrap: "balance" }}>
              {c.h1a}
              <span style={{ color: "#35D07F" }}>{c.h1b}</span>
            </h1>
            <p style={{ font: `500 clamp(15px,1.5vw,17px)/1.6 ${CORPO}`, color: "#A9BBCB", maxWidth: 520, margin: "0 0 22px" }}>{c.sub}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(53,208,127,.1)", border: "1px solid rgba(53,208,127,.24)", padding: "9px 16px", borderRadius: 999, marginBottom: 28 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#35D07F", animation: "rl-blink 1.4s infinite", flex: "none" }} />
              {dados.kpiAoVivo ? (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>
                  Mais de <b data-count-to={dados.kpiAoVivo} style={{ fontWeight: 800, color: "#fff" }}>0</b>+ oportunidades monitoradas agora
                </span>
              ) : (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>Milhares de oportunidades monitoradas agora</span>
              )}
            </div>
            <div style={{ maxWidth: 440 }}>
              <a href="#oferta" className="rlv-cta">
                <Gem size={16} fill="#fff" strokeWidth={0} /> QUERO TER VANTAGEM NO MERCADO
              </a>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", font: `600 12.5px ${CORPO}`, color: "#8fa2b3" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#35D07F" }}>
                  <Check size={14} strokeWidth={2.4} /> Sem fidelidade
                </span>
                <span style={{ color: "#5f7183" }}>·</span>cancele quando quiser
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 300px", minWidth: 260, display: "flex", justifyContent: "center" }}>
            <Fone src="/vendas/home.png" alt="Painel Repasse Livre" largura="min(240px,62vw)" aspecto="350 / 712" flutua />
          </div>
        </div>
      </section>

      {/* 3 ── radar / orbit */}
      <section data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(700px 500px at 78% 50%,rgba(34,197,94,.14),transparent 62%),linear-gradient(160deg,#0C2417,#07120C)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(32px,4vw,56px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(53,208,127,.12)", border: "1px solid rgba(53,208,127,.28)", color: "#35D07F", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".16em", marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#35D07F", animation: "rl-blink 1.4s infinite" }} /> MONITORAMENTO EM TEMPO REAL
            </div>
            <h2 style={{ font: `800 clamp(26px,3.6vw,38px)/1.12 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 16px", textWrap: "balance" }}>
              O mercado inteiro <span style={{ color: "#35D07F" }}>gira em torno de você.</span>
            </h2>
            <p style={{ font: `500 clamp(15px,1.5vw,16px)/1.6 ${CORPO}`, color: "#A9BBCB", maxWidth: 460, margin: "0 0 24px" }}>OLX, Webmotors e Mercado Livre monitorados 24 horas por dia, num radar só. O BIA varre cada plataforma sem parar — você recebe a oportunidade pronta, no centro de tudo.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "8px 14px", font: `700 12.5px ${CORPO}`, color: "#D6E2EC" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#35D07F" }} /> 3 plataformas conectadas
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "8px 14px", font: `700 12.5px ${CORPO}`, color: "#D6E2EC" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F0A868" }} /> Facebook Marketplace em breve
              </span>
            </div>
            <div style={{ marginTop: 22, font: `700 11px ${CORPO}`, letterSpacing: ".18em", color: "#5f8a72", textTransform: "uppercase" }}>Sincronização 100% nativa</div>
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
                    <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "clamp(42px,10vw,54px)", padding: "0 clamp(12px,2.4vw,16px)", background: "#fff", borderRadius: 14, boxShadow: "0 12px 26px -8px rgba(0,0,0,.5)", opacity: l.breve ? 0.7 : 1 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.src} alt={l.alt} style={{ height: l.h, width: "auto", display: "block" }} />
                      {l.breve && <span style={{ position: "absolute", top: -9, right: -6, background: "#F0A868", color: "#3a2410", font: `800 7px ${CORPO}`, letterSpacing: ".08em", padding: "2px 6px", borderRadius: 6 }}>EM BREVE</span>}
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
            <div style={{ font: `700 11px ${CORPO}`, letterSpacing: ".2em", color: "#16A34A", textTransform: "uppercase", marginBottom: 12 }}>O mercado não espera</div>
            <h2 style={{ font: `800 clamp(24px,3.4vw,34px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>{c.timeline}</h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 38 }}>
            <div style={{ position: "absolute", left: 12, top: 6, bottom: 6, width: 2, background: "linear-gradient(#16A34A,#cbe8d5)" }} />
            {[
              { n: "1", esc: false, t: "A oportunidade aparece", s: "Um veículo entra no mercado abaixo da FIPE. A janela abre." },
              { n: "2", esc: false, t: "O BIA te avisa em segundos", s: "Com a análise pronta: preço, margem, procedência e Score." },
              { n: "3", esc: true, t: "Você chega primeiro", s: "Enquanto os outros ainda procuram na mão. O mercado recompensa velocidade." },
            ].map((p, i, arr) => (
              <div key={p.n} style={{ position: "relative", marginBottom: i < arr.length - 1 ? 26 : 0 }}>
                <span style={{ position: "absolute", left: -38, top: 0, width: 26, height: 26, borderRadius: "50%", background: p.esc ? "#0F1B2D" : "#16A34A", color: p.esc ? "#35D07F" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 12px ${TIT}` }}>{p.n}</span>
                <div style={{ font: `700 clamp(15px,1.7vw,17px) ${CORPO}`, color: "#0F1B2D" }}>{p.t}</div>
                <div style={{ font: `500 14px/1.55 ${CORPO}`, color: "#6A7686" }}>{p.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 ── comparativo VS */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: PAD }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={eyebrow}>Duas formas de comprar</div>
            <h3 style={{ font: `800 clamp(24px,3.4vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>De um lado, o cansaço. Do outro, a vantagem.</h3>
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
                {["Abrir OLX, Webmotors, ML…", "Comparar preços na mão", "Conferir a FIPE de cada um", "Torcer pra valer a pena"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 14px ${CORPO}`, color: "#8a5d59" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#F7D7D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9463E" }}><X size={11} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#F9DAD6", borderRadius: 12, padding: "11px 14px", font: `700 12.5px ${CORPO}`, color: "#C0392E" }}>Outra pessoa já fechou negócio.</div>
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
                {["Mercado monitorado sozinho", "Oportunidades organizadas", "Copiloto analisa cada anúncio", "BIA compara com o mercado"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 14px ${CORPO}`, color: "#2f6446" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={12} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#16A34A", borderRadius: 12, padding: "11px 14px", font: `800 12.5px ${CORPO}`, color: "#fff" }}>Você chega primeiro e decide na hora.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 ── banda escura "o verdadeiro produto" */}
      <section data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", background: "radial-gradient(600px 300px at 50% -20px,rgba(34,197,94,.18),transparent 65%),linear-gradient(165deg,#0E2A1A,#081410)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "clamp(44px,5.5vw,76px) clamp(20px,5vw,56px)", textAlign: "center" }}>
          <div style={eyebrowEsc}>O verdadeiro produto</div>
          <h3 style={{ font: `800 clamp(22px,3vw,28px)/1.2 ${TIT}`, color: "#fff", margin: "0 0 6px" }}>Você não compra acesso a anúncios.</h3>
          <p style={{ font: `500 14px ${CORPO}`, color: "#9FB0C4", margin: "0 0 20px" }}>Você compra:</p>
          <div style={{ font: `800 clamp(22px,3.2vw,30px)/1.4 ${TIT}`, color: "#35D07F", letterSpacing: "-.01em" }}>Tempo. Velocidade. Informação. Inteligência. <span style={{ color: "#fff" }}>Vantagem competitiva.</span></div>
        </div>
      </section>

      {/* 7 ── features + celular */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,52px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 380px", minWidth: 280 }}>
            <div style={eyebrow}>O que você desbloqueia</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 22px" }}>Tudo pra chegar primeiro.</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px 24px" }}>
              {[
                { Ic: LayoutGrid, t: "BIA", s: "Banco de Inteligência Automotiva" },
                { Ic: Compass, t: "Copiloto de Compra", s: "Análise inteligente de cada anúncio" },
                { Ic: BarChart3, t: "Comparativos de mercado", s: "Cidade, estado e Brasil" },
                { Ic: TrendingDown, t: "Oportunidades abaixo da FIPE", s: "Só o que está barato de verdade" },
                { Ic: Bell, t: "Alertas inteligentes", s: "Avisado assim que o carro certo entra" },
                { Ic: Star, t: "Score Repasse Livre", s: "O quanto o negócio vale, num número" },
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
          </div>
          <div style={{ flex: "1 1 260px", minWidth: 240, display: "flex", justifyContent: "center" }}>
            <Fone src="/vendas/anuncio-copiloto.png" alt="Análise do Copiloto" largura="min(230px,64vw)" />
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
              <span style={{ font: `800 10px ${CORPO}`, letterSpacing: ".14em", color: "#0F7A3D" }}>ALERTA EM TEMPO REAL</span>
            </div>
            <h3 style={{ font: `800 clamp(23px,3vw,30px)/1.18 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>08:12. Seu celular vibra: uma oferta acabou de entrar.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Enquanto centenas de compradores ainda nem viram esse anúncio, você já está falando com o vendedor.</p>
            <p style={{ font: `700 16px/1.5 ${TIT}`, color: "#0F1B2D", margin: 0 }}>O mercado recompensa quem chega primeiro — <span style={{ color: "#16A34A" }}>não quem procura por mais tempo.</span></p>
          </div>
        </div>
      </section>

      {/* 9 ── dashboard showcase */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: PAD }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={eyebrow}>Inteligência de estoque</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>Onde estão os carros — e por quanto.</h3>
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(15,27,45,.4)", border: "1px solid #E2E6EC", background: "#fff" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "11px 14px", background: "#F3F5F8", borderBottom: "1px solid #E7EAEE" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ marginLeft: 12, background: "#fff", border: "1px solid #E7EAEE", borderRadius: 7, padding: "4px 12px", font: `600 11px ${CORPO}`, color: "#8A96A5" }}>repasselivre.com/painel</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vendas/home-full-2.png" alt="Dashboard do mercado" style={{ width: "100%", display: "block" }} />
          </div>
        </div>
      </section>

      {/* 10 ── tendências */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,48px)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={eyebrow}>Dashboard BIA</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 12px" }}>Você enxerga o mercado como ninguém.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 20px" }}>Margem média por modelo, os carros mais disputados, o mapa do alto padrão e pra onde o preço de cada região está indo — antes da concorrência. O mercado inteiro num painel só.</p>
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
            <p style={{ font: `600 13px/1.5 ${CORPO}`, color: "#7A8698", margin: "16px 0 0" }}>↳ Escassez valoriza a barganha: quando aparece, o desconto está mais gordo — <b style={{ color: "#16A34A" }}>vale agir rápido.</b></p>
          </div>
          <div style={{ flex: "0 1 240px", minWidth: 210, display: "flex", justifyContent: "center" }}>
            <Fone src="/vendas/bia-parte6-tendencias.png" alt="Tendências do mês" largura="min(220px,62vw)" flutua />
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
        </div>
      </section>

      {/* 12 ── experimente agora (demo real) */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#fff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: PAD, display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,48px)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            <div style={eyebrow}>Experimente agora — sem compromisso</div>
            <h3 style={{ font: `800 clamp(24px,3.2vw,32px)/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>Abra uma oferta real e veja o Copiloto trabalhar.</h3>
            <p style={{ font: `500 15px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Esta é uma oportunidade de verdade, abaixo da FIPE, com o Copiloto e a análise <b style={{ color: "#0F1B2D" }}>liberados</b> pra você sentir o produto — sem cadastro e sem sair daqui.</p>
            <p style={{ font: `700 16px/1.5 ${TIT}`, color: "#0F1B2D", margin: "0 0 18px" }}>Enquanto a maioria ainda está procurando… <span style={{ color: "#16A34A" }}>você já encontrou.</span></p>
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

      {/* 13 ── quanto vale (equação) */}
      <section data-reveal style={{ ...REVEAL, width: "100%", background: "#EEF1F4" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", textAlign: "center" }}>
          <div style={eyebrow}>A conta é simples</div>
          <h3 style={{ font: `800 clamp(24px,3.4vw,34px) ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 12px" }}>Quanto vale isso?</h3>
          <p style={{ font: `500 clamp(15px,1.6vw,17px) ${CORPO}`, color: "#6A7686", maxWidth: 560, margin: "0 auto 32px" }}>Encontrar <b style={{ color: "#0F1B2D" }}>um único</b> veículo com R$ 5.000 de margem extra já se paga muitas vezes.</p>
          <div className="pv-vert" style={{ gap: "clamp(14px,2vw,22px)" }}>
            <div className="pv-vert-box" style={{ flex: "1 1 280px", maxWidth: 360, background: "#fff", border: "1px solid #E4EAF0", borderRadius: 20, padding: "26px 24px", boxShadow: "0 20px 44px -22px rgba(15,27,45,.3)" }}>
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
              <div style={{ font: `600 13px ${CORPO}`, color: "#9FB0C4", marginTop: 4 }}>o valor promocional, travado pra você</div>
            </div>
          </div>
          <div style={{ marginTop: 32, font: `800 clamp(24px,3.8vw,34px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>Um bom negócio paga anos de assinatura.</div>
        </div>
      </section>

      {/* 14 ── card de oferta (escuro) */}
      <section id="oferta" data-reveal style={{ ...REVEAL, width: "100%", position: "relative", overflow: "hidden", scrollMarginTop: 70, background: "radial-gradient(700px 360px at 78% -20px,rgba(34,197,94,.2),transparent 60%),linear-gradient(165deg,#0E2A1A,#081410)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "clamp(48px,6vw,84px) clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(32px,4vw,56px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 380px", minWidth: 290 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(53,208,127,.14)", color: "#35D07F", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}><Gem size={11} fill="#35D07F" strokeWidth={0} /> REPASSE LIVRE PRO</span>
              <span style={{ background: "rgba(217,119,46,.2)", color: "#F0A868", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}>OFERTA POR TEMPO LIMITADO</span>
            </div>
            <h3 style={{ font: `800 clamp(26px,3.6vw,38px)/1.14 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 14px", textWrap: "balance" }}>
              Trave {dados.precoValor}
              {dados.precoIntervalo} — pra sempre.
            </h3>
            <p style={{ font: `500 clamp(14px,1.5vw,16px)/1.6 ${CORPO}`, color: "#9FB0C4", maxWidth: 460, margin: "0 0 24px" }}>O BIA já monitora milhares de anúncios todos os dias — a inteligência está pronta pra trabalhar por você agora. Garanta o valor promocional e ele fica travado enquanto você for assinante.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {[
                <>Preço promocional de <b style={{ color: "#fff" }}>{dados.precoValor}{dados.precoIntervalo}</b> — travado pra sempre</>,
                <>Acesso total: <b style={{ color: "#fff" }}>BIA, Copiloto, Score, Alertas, Dashboard e Comparativos</b></>,
                <>Prioridade nas próximas novidades da plataforma</>,
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
              <div style={{ textAlign: "center", font: `700 10px ${CORPO}`, letterSpacing: ".16em", color: "#5f8a72", textTransform: "uppercase", marginBottom: 8 }}>Oferta por tempo limitado</div>
              {dados.precoAncoraTexto && <div style={{ textAlign: "center", font: `600 13px ${CORPO}`, color: "#7f93a3", textDecoration: "line-through" }}>De {dados.precoAncoraTexto}/mês</div>}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5, margin: "4px 0 14px" }}>
                <span style={{ font: `800 clamp(48px,7vw,60px)/1 ${TIT}`, color: "#fff", letterSpacing: "-.03em" }}>{dados.precoValor}</span>
                <span style={{ font: `700 18px ${TIT}`, color: "#A9BBCB" }}>{dados.precoIntervalo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(221,107,54,.16)", color: "#F0A868", padding: "10px 14px", borderRadius: 12, font: `700 13px ${CORPO}`, marginBottom: 22 }}>
                <Clock size={14} strokeWidth={2.2} /> Sua oferta expira em <ContadorTexto />
              </div>
              <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : rotuloAssinar} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} className="rlv-cta" />
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
            { q: "Os anúncios são do Repasse Livre?", a: "Não. O Repasse Livre monitora e organiza oportunidades dos principais marketplaces automotivos do Brasil — OLX, Webmotors e Mercado Livre — transformando milhares de anúncios em inteligência de mercado." },
            { q: "Os veículos ficam abaixo da FIPE?", a: "Sim. Nossa plataforma identifica automaticamente anúncios abaixo da FIPE e mostra esse percentual de forma clara, pra facilitar a comparação e a decisão." },
            { q: "O que é o Copiloto?", a: "É o sistema de análise do Repasse Livre. Ele compara cada anúncio com veículos semelhantes monitorados pela plataforma e gera um parecer técnico baseado em dados reais do mercado." },
            { q: "O que é o BIA?", a: "O BIA (Banco de Inteligência Automotiva) é o motor de inteligência do Repasse Livre. Ele monitora continuamente o mercado pra transformar dados dispersos em informação estratégica." },
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
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#35D07F" }}><Clock size={22} strokeWidth={2} /></div>
          <h3 style={{ font: `800 clamp(24px,3.6vw,32px) ${TIT}`, color: "#fff", margin: "0 0 10px", letterSpacing: "-.02em" }}>Quem compra melhor, <span style={{ color: "#35D07F" }}>lucra mais.</span></h3>
          <p style={{ font: `500 15px ${CORPO}`, color: "#9FB0C4", margin: "0 0 26px" }}>{c.finalSub}</p>
          <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : "ACESSAR O REPASSE LIVRE PRO"} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} className="rlv-cta rlv-cta--inline" />
          <div style={{ marginTop: 18, font: `500 12px ${CORPO}`, color: "#6f8598" }}>→ Enquanto você lia isto, mais carros entraram abaixo da FIPE.</div>
        </div>
      </section>
    </div>
  );
}
