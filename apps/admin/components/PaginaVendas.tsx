"use client";

import { useEffect, type CSSProperties } from "react";
import {
  Gem,
  Clock,
  Zap,
  Bell,
  Check,
  X,
  TrendingDown,
  BarChart3,
  LayoutGrid,
  Compass,
  Star,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { ExperimenteDemo } from "@/components/ExperimenteDemo";
import { ContadorRelogio, ContadorTexto } from "@/components/ContadorVendas";
import type { OfertaDemo } from "@/lib/ofertaDemo";

export interface DadosVendas {
  variante: "padrao" | "fomo";
  precoValor: string; // "R$ 97"
  precoIntervalo: string; // "/mês"
  precoAncoraTexto: string | null; // "R$ 248"
  descontoPct: number | null; // 61
  kpiAoVivo: number | null; // 5000
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

const COPY = {
  padrao: {
    h1a: "Enquanto outros procuram carros, você encontra ",
    h1b: "oportunidades.",
    sub: "O BIA monitora milhares de anúncios dos principais marketplaces do Brasil, identifica o que está abaixo da FIPE e entrega inteligência pronta — pra quem compra primeiro.",
    timeline: "Quem compra primeiro é quem encontrou primeiro.",
    finalSub: "Comece hoje e trave o valor promocional antes que ele suba.",
  },
  fomo: {
    h1a: "Enquanto o mercado inteiro procura, você já ",
    h1b: "encontrou.",
    sub: "Cada minuto procurando na mão, outro comprador chega antes. O BIA vigia o mercado por você e entrega a oportunidade pronta — com o Copiloto já analisado. Você só chega e fecha.",
    timeline: "No fim, quem chega primeiro é quem lucra.",
    finalSub: "Quem chega primeiro leva. Trave o valor promocional agora.",
  },
} as const;

/** Moldura de celular com screenshot real. */
function Fone({
  src,
  alt,
  largura,
  aspecto = "350 / 708",
  flutua = false,
}: {
  src: string;
  alt: string;
  largura: number;
  aspecto?: string;
  flutua?: boolean;
}) {
  return (
    <div
      style={{
        width: largura,
        flex: "none",
        padding: 7,
        background: "linear-gradient(160deg,#22354f,#0F1B2D)",
        borderRadius: 34,
        boxShadow: "0 26px 50px -14px rgba(15,27,45,.55)",
        animation: flutua ? "rl-float 5.6s ease-in-out infinite" : undefined,
      }}
    >
      <div style={{ position: "relative", borderRadius: 27, overflow: "hidden", background: "#EEF1F4", aspectRatio: aspecto }}>
        <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 54, height: 5, borderRadius: 5, background: "#0F1B2D", zIndex: 3 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
      </div>
    </div>
  );
}

const eyebrow: CSSProperties = { font: `700 11px ${CORPO}`, letterSpacing: ".18em", color: "#16A34A", textTransform: "uppercase", marginBottom: 10 };

export function PaginaVendas({ dados }: { dados: DadosVendas }) {
  const c = COPY[dados.variante];
  const rotuloAssinar = `QUERO TRAVAR ${dados.precoValor}/MÊS`;

  // Este componente NÃO tem estado por-segundo (o relógio vive nos ContadorRelogio/
  // ContadorTexto isolados) → renderiza uma vez só, então o count-up e o reveal
  // via DOM direto sobrevivem (o React não re-renderiza pra resetá-los).
  useEffect(() => {
    // ── Count-up + reveal on scroll ──
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
      { threshold: 0.12 }
    );
    const t1 = setTimeout(() => document.querySelectorAll<HTMLElement>("[data-reveal],[data-count-to]").forEach((el) => io.observe(el)), 40);
    // Fallback: nunca deixa nada invisível (sem scroll / sem IO).
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
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 700px at 50% -10%, #e7ebf0, #d3dae2)", padding: "40px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 660, borderRadius: 24, overflow: "hidden", background: "#EEF1F4", boxShadow: "0 40px 90px -28px rgba(15,27,45,.45)", border: "1px solid rgba(255,255,255,.6)" }}>

        {dados.aviso === "sucesso" && (
          <div style={{ background: "#0F7A3D", color: "#fff", padding: "12px 22px", font: `600 13px ${CORPO}`, display: "flex", gap: 8, alignItems: "center" }}>
            <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso PRO libera em instantes — recarregue em alguns segundos se ainda não apareceu.
          </div>
        )}
        {dados.aviso === "cancelado" && (
          <div style={{ background: "#F3F5F8", color: "#566577", padding: "12px 22px", font: `600 13px ${CORPO}` }}>Checkout cancelado. Quando quiser, é só voltar e assinar.</div>
        )}

        {/* 1 ── barra de urgência */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px", background: "#081410", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ lineHeight: 1.15 }}>
            {dados.descontoPct != null && <div style={{ font: `800 13px ${CORPO}`, color: "#35D07F" }}>HOJE: {dados.descontoPct}% OFF</div>}
            <div style={{ font: `600 10px ${CORPO}`, letterSpacing: ".04em", color: "#7f93a3" }}>Oferta por tempo limitado</div>
          </div>
          <ContadorRelogio />
        </div>

        {/* 2 ── hero cinematográfico */}
        <div style={{ position: "relative", overflow: "hidden", padding: "46px 40px 150px", background: "radial-gradient(700px 400px at 78% 12%,rgba(34,197,94,.20),transparent 60%),linear-gradient(165deg,#0E2A1A 0%,#0A1C13 55%,#081410 100%)" }}>
          <div style={{ position: "absolute", top: 20, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(53,208,127,.25),transparent 70%)", filter: "blur(10px)" }} />
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(53,208,127,.12)", color: "#35D07F", border: "1px solid rgba(53,208,127,.3)", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".14em", marginBottom: 22 }}>
              <Gem size={12} fill="#35D07F" strokeWidth={0} /> REPASSE LIVRE PRO
            </div>
            <h1 style={{ font: `800 41px/1.08 ${TIT}`, color: "#fff", letterSpacing: "-.025em", margin: "0 0 18px", textWrap: "balance" }}>
              {c.h1a}
              <span style={{ color: "#35D07F" }}>{c.h1b}</span>
            </h1>
            <p style={{ font: `500 16px/1.6 ${CORPO}`, color: "#A9BBCB", maxWidth: 430, margin: "0 auto 24px" }}>{c.sub}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(53,208,127,.1)", border: "1px solid rgba(53,208,127,.24)", padding: "9px 16px", borderRadius: 999 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#35D07F", animation: "rl-blink 1.4s infinite", flex: "none" }} />
              {dados.kpiAoVivo ? (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>
                  Mais de <b data-count-to={dados.kpiAoVivo} style={{ fontWeight: 800, color: "#fff" }}>0</b>+ oportunidades monitoradas agora
                </span>
              ) : (
                <span style={{ font: `600 13px ${CORPO}`, color: "#CDE9D6" }}>Milhares de oportunidades monitoradas agora</span>
              )}
            </div>
          </div>
        </div>

        {/* 3 ── card de preço flutuante */}
        <div style={{ margin: "-120px 40px 0", position: "relative", zIndex: 5 }} id="assinar-topo">
          <div style={{ background: "#fff", borderRadius: 22, padding: "28px 26px", boxShadow: "0 30px 60px -20px rgba(8,20,16,.5)", textAlign: "center" }}>
            {dados.precoAncoraTexto && <div style={{ font: `600 13px ${CORPO}`, color: "#9AA6B4", textDecoration: "line-through" }}>De {dados.precoAncoraTexto}/mês</div>}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, margin: "4px 0 14px" }}>
              <span style={{ font: `800 58px/1 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.03em" }}>{dados.precoValor}</span>
              <span style={{ font: `700 19px ${TIT}`, color: "#566577" }}>{dados.precoIntervalo}</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FDEBE1", color: "#DD6B36", padding: "9px 16px", borderRadius: 999, font: `700 13px ${CORPO}`, marginBottom: 20 }}>
              <Clock size={14} strokeWidth={2.2} /> Expira em <ContadorTexto />
            </div>
            <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : rotuloAssinar} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} className="rlv-cta" />
            <div style={{ marginTop: 12, font: `600 12px ${CORPO}`, color: "#8A96A5" }}>Sem fidelidade — cancele quando quiser.</div>
          </div>
        </div>

        {/* 4 ── logos */}
        <div data-reveal style={{ ...REVEAL, padding: "34px 40px", textAlign: "center" }}>
          <div style={{ ...eyebrow, letterSpacing: ".2em", marginBottom: 18 }}>O mercado inteiro, num lugar só.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E9EDF2", borderRadius: 14, padding: "16px 10px", font: `800 16px ${TIT}`, color: "#5b2ea8" }}>OLX</div>
            <div style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E9EDF2", borderRadius: 14, padding: "16px 10px", font: `800 15px ${TIT}`, color: "#0F1B2D" }}>webmotors</div>
            <div style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E9EDF2", borderRadius: 14, padding: "16px 10px", font: `800 13px ${TIT}`, color: "#0F7A3D" }}>
              mercado<span style={{ color: "#f5c518" }}>livre</span>
            </div>
            <div style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E9EDF2", borderRadius: 14, padding: "12px 10px" }}>
              <div style={{ font: `800 13px ${TIT}`, color: "#1877F2" }}>facebook</div>
              <div style={{ display: "inline-block", marginTop: 5, background: "#EAF7EF", color: "#16A34A", font: `800 8px ${CORPO}`, letterSpacing: ".1em", padding: "2px 7px", borderRadius: 6 }}>EM BREVE</div>
            </div>
          </div>
        </div>

        {/* 5 ── timeline */}
        <div data-reveal style={{ ...REVEAL, padding: "20px 40px 34px" }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ ...eyebrow, letterSpacing: ".2em", marginBottom: 12 }}>O mercado não espera</div>
            <h2 style={{ font: `800 29px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>{c.timeline}</h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 34 }}>
            <div style={{ position: "absolute", left: 11, top: 6, bottom: 6, width: 2, background: "linear-gradient(#16A34A,#cbe8d5)" }} />
            {[
              { n: "1", escuro: false, t: "A oportunidade aparece", s: "Um veículo entra no mercado abaixo da FIPE. A janela abre." },
              { n: "2", escuro: false, t: "O BIA te avisa em segundos", s: "Com a análise pronta: preço, margem, procedência e Score." },
              { n: "3", escuro: true, t: "Você chega primeiro", s: "Enquanto os outros ainda procuram na mão. O mercado recompensa velocidade." },
            ].map((p, i, arr) => (
              <div key={p.n} style={{ position: "relative", marginBottom: i < arr.length - 1 ? 22 : 0 }}>
                <span style={{ position: "absolute", left: -34, top: 0, width: 24, height: 24, borderRadius: "50%", background: p.escuro ? "#0F1B2D" : "#16A34A", color: p.escuro ? "#35D07F" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 11px ${TIT}` }}>{p.n}</span>
                <div style={{ font: `700 15px ${CORPO}`, color: "#0F1B2D" }}>{p.t}</div>
                <div style={{ font: `500 13px/1.55 ${CORPO}`, color: "#6A7686" }}>{p.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 6 ── comparativo VS */}
        <div data-reveal style={{ ...REVEAL, padding: "14px 40px 34px" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ ...eyebrow, letterSpacing: ".2em" }}>Duas formas de comprar</div>
            <h3 style={{ font: `800 26px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>De um lado, o cansaço. Do outro, a vantagem.</h3>
          </div>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#FEF5F4,#FDECEA)", border: "1px solid #F3D3CF", borderRadius: 20, padding: "24px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
                <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "#F7D7D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9463E" }}><Clock size={21} strokeWidth={2} /></span>
                <div>
                  <div style={{ font: `800 10px ${CORPO}`, letterSpacing: ".12em", color: "#C97a74", textTransform: "uppercase" }}>O jeito antigo</div>
                  <div style={{ font: `800 17px ${TIT}`, color: "#C0392E" }}>Sem o Repasse Livre</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
                {["Abrir OLX, Webmotors, ML…", "Comparar preços na mão", "Conferir a FIPE de cada um", "Torcer pra valer a pena"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 13.5px ${CORPO}`, color: "#8a5d59" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#F7D7D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#D9463E" }}><X size={11} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#F9DAD6", borderRadius: 12, padding: "11px 14px", font: `700 12.5px ${CORPO}`, color: "#C0392E" }}>Outra pessoa já fechou negócio.</div>
            </div>

            <div style={{ position: "relative", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#F1FBF5,#E6F7EC)", border: "2px solid #16A34A", borderRadius: 20, padding: "24px 22px", boxShadow: "0 22px 46px -18px rgba(22,163,74,.5)", transform: "translateY(-8px)" }}>
              <span style={{ position: "absolute", top: -11, right: 16, background: "#16A34A", color: "#fff", font: `800 9px ${CORPO}`, letterSpacing: ".12em", padding: "5px 11px", borderRadius: 999, boxShadow: "0 6px 14px -4px rgba(22,163,74,.6)" }}>RECOMENDADO</span>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
                <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 8px 18px -6px rgba(22,163,74,.7)" }}><Zap size={20} fill="#fff" strokeWidth={0} /></span>
                <div>
                  <div style={{ font: `800 10px ${CORPO}`, letterSpacing: ".12em", color: "#5F9E77", textTransform: "uppercase" }}>O jeito Repasse Livre</div>
                  <div style={{ font: `800 17px ${TIT}`, color: "#0F7A3D" }}>Com o Repasse Livre</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
                {["Mercado monitorado sozinho", "Oportunidades organizadas", "Copiloto analisa cada anúncio", "BIA compara com o mercado"].map((x) => (
                  <div key={x} style={{ display: "flex", gap: 11, alignItems: "center", font: `600 13.5px ${CORPO}`, color: "#2f6446" }}>
                    <span style={{ flex: "none", width: 23, height: 23, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={12} strokeWidth={3.2} /></span>
                    {x}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 9, alignItems: "center", background: "#16A34A", borderRadius: 12, padding: "11px 14px", font: `800 12.5px ${CORPO}`, color: "#fff" }}>Você chega primeiro e decide na hora.</div>
            </div>

            <span style={{ position: "absolute", left: "50%", top: "calc(50% - 4px)", transform: "translate(-50%,-50%)", zIndex: 4, width: 46, height: 46, borderRadius: "50%", background: "#0F1B2D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 15px ${TIT}`, boxShadow: "0 10px 24px -8px rgba(15,27,45,.65)", border: "3px solid #EEF1F4" }}>VS</span>
          </div>
        </div>

        {/* 7 ── banda escura "o verdadeiro produto" */}
        <div data-reveal style={{ ...REVEAL, position: "relative", overflow: "hidden", padding: 40, background: "radial-gradient(500px 240px at 50% -20px,rgba(34,197,94,.18),transparent 65%),linear-gradient(165deg,#0E2A1A,#081410)", textAlign: "center" }}>
          <div style={{ font: `700 11px ${CORPO}`, letterSpacing: ".2em", color: "#35D07F", textTransform: "uppercase", marginBottom: 14 }}>O verdadeiro produto</div>
          <h3 style={{ font: `800 25px/1.2 ${TIT}`, color: "#fff", margin: "0 0 6px" }}>Você não compra acesso a anúncios.</h3>
          <p style={{ font: `500 14px ${CORPO}`, color: "#9FB0C4", margin: "0 0 20px" }}>Você compra:</p>
          <div style={{ font: `800 25px/1.4 ${TIT}`, color: "#35D07F", letterSpacing: "-.01em" }}>Tempo. Velocidade. Informação. Inteligência. <span style={{ color: "#fff" }}>Vantagem competitiva.</span></div>
        </div>

        {/* 8 ── features + celular */}
        <div data-reveal style={{ ...REVEAL, padding: "36px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 26, alignItems: "start" }}>
            <div>
              <div style={eyebrow}>O que você desbloqueia</div>
              <h3 style={{ font: `800 26px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 18px" }}>Tudo pra chegar primeiro.</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { Ic: LayoutGrid, t: "BIA", s: "Banco de Inteligência Automotiva" },
                  { Ic: Compass, t: "Copiloto de Compra", s: "Análise inteligente de cada anúncio" },
                  { Ic: BarChart3, t: "Comparativos de mercado", s: "Cidade, estado e Brasil" },
                  { Ic: TrendingDown, t: "Oportunidades abaixo da FIPE", s: "Só o que está barato de verdade" },
                  { Ic: Bell, t: "Alertas inteligentes", s: "Avisado assim que o carro certo entra" },
                  { Ic: Star, t: "Score Repasse Livre", s: "O quanto o negócio vale, num número" },
                ].map(({ Ic, t, s }) => (
                  <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: "rgba(22,163,74,.12)", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={2} /></span>
                    <div>
                      <div style={{ font: `700 14px ${CORPO}`, color: "#0F1B2D" }}>{t}</div>
                      <div style={{ font: `500 13px ${CORPO}`, color: "#8090a0" }}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "sticky", top: 20 }}>
              <Fone src="/vendas/anuncio-copiloto.png" alt="Análise do Copiloto" largura={200} />
            </div>
          </div>
        </div>

        {/* 9 ── 08:12 alerta */}
        <div data-reveal style={{ ...REVEAL, padding: "8px 40px 40px" }}>
          <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#F4FBF6,#EAF6EF)", border: "1px solid #DCEEE2", borderRadius: 22, padding: "26px 24px", display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "center" }}>
            <div style={{ position: "absolute", top: -70, left: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,.22),transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <Fone src="/vendas/home.png" alt="Oportunidade abaixo da FIPE" largura={180} aspecto="350 / 712" flutua />
              <div style={{ position: "absolute", top: 24, right: -20, zIndex: 5, display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E4EAF0", borderRadius: 14, padding: "9px 12px", boxShadow: "0 16px 34px -12px rgba(15,27,45,.4)", animation: "rl-float 4.4s ease-in-out infinite" }}>
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
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(22,163,74,.1)", border: "1px solid rgba(22,163,74,.22)", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", animation: "rl-blink 1.4s infinite" }} />
                <span style={{ font: `800 10px ${CORPO}`, letterSpacing: ".14em", color: "#0F7A3D" }}>ALERTA EM TEMPO REAL</span>
              </div>
              <h3 style={{ font: `800 25px/1.18 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>08:12. Seu celular vibra: uma oferta acabou de entrar.</h3>
              <p style={{ font: `500 14px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Enquanto centenas de compradores ainda nem viram esse anúncio, você já está falando com o vendedor.</p>
              <p style={{ font: `700 15px/1.5 ${TIT}`, color: "#0F1B2D", margin: 0 }}>O mercado recompensa quem chega primeiro — <span style={{ color: "#16A34A" }}>não quem procura por mais tempo.</span></p>
            </div>
          </div>
        </div>

        {/* 10 ── dashboard showcase */}
        <div data-reveal style={{ ...REVEAL, padding: "8px 40px 34px" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={eyebrow}>Inteligência de estoque</div>
            <h3 style={{ font: `800 25px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>Onde estão os carros — e por quanto.</h3>
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(15,27,45,.4)", border: "1px solid #E2E6EC", background: "#fff" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "11px 14px", background: "#F3F5F8", borderBottom: "1px solid #E7EAEE" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ marginLeft: 12, background: "#fff", border: "1px solid #E7EAEE", borderRadius: 7, padding: "4px 12px", font: `600 11px ${CORPO}`, color: "#8A96A5" }}>repasselivre.com/painel</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vendas/home-full.png" alt="Dashboard do mercado" style={{ width: "100%", display: "block" }} />
          </div>
        </div>

        {/* 11 ── tendências / dashboard BIA */}
        <div data-reveal style={{ ...REVEAL, padding: "8px 40px 38px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 26, alignItems: "center" }}>
            <div>
              <div style={eyebrow}>Dashboard BIA</div>
              <h3 style={{ font: `800 26px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 12px" }}>Você enxerga o mercado como ninguém.</h3>
              <p style={{ font: `500 14px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 18px" }}>Margem média por modelo, os carros mais disputados, o mapa do alto padrão e pra onde o preço de cada região está indo — antes da concorrência. O mercado inteiro num painel só.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 148, background: "#fff", border: "1px solid #EAEEF3", borderRadius: 14, padding: "13px 15px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#16A34A" }} />
                    <span style={{ font: `800 13px ${TIT}`, color: "#0F1B2D" }}>Compass</span>
                    <span style={{ font: `600 10px ${CORPO}`, color: "#9AA6B4" }}>Jeep</span>
                  </div>
                  <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".08em", color: "#9AA6B4", textTransform: "uppercase", marginBottom: 2 }}>Margem média</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ font: `800 15px ${TIT}`, color: "#0F1B2D" }}>9.3%→10.6%</span>
                    <span style={{ font: `800 11px ${CORPO}`, color: "#16A34A" }}>▲ 1.3pp</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 148, background: "#fff", border: "1px solid #EAEEF3", borderRadius: 14, padding: "13px 15px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E0A800" }} />
                    <span style={{ font: `800 13px ${TIT}`, color: "#0F1B2D" }}>Onix</span>
                    <span style={{ font: `600 10px ${CORPO}`, color: "#9AA6B4" }}>Chevrolet</span>
                  </div>
                  <div style={{ font: `700 10px ${CORPO}`, letterSpacing: ".08em", color: "#9AA6B4", textTransform: "uppercase", marginBottom: 2 }}>Oferta média</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ font: `800 15px ${TIT}`, color: "#0F1B2D" }}>98→79 un.</span>
                    <span style={{ font: `800 11px ${CORPO}`, color: "#DD6B36" }}>▼ 19%</span>
                  </div>
                </div>
              </div>
              <p style={{ font: `600 12.5px/1.5 ${CORPO}`, color: "#7A8698", margin: "14px 0 0" }}>↳ Escassez valoriza a barganha: quando aparece, o desconto está mais gordo — <b style={{ color: "#16A34A" }}>vale agir rápido.</b></p>
            </div>
            <Fone src="/vendas/bia-parte6-tendencias.png" alt="Tendências do mês" largura={190} flutua />
          </div>
        </div>

        {/* 12 ── carrossel */}
        <div data-reveal style={{ ...REVEAL, padding: "8px 0 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={eyebrow}>Na palma da mão</div>
            <h3 style={{ font: `800 25px ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: 0 }}>Veja por dentro.</h3>
          </div>
          <div className="rlv-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "6px 40px 16px", scrollSnapType: "x mandatory" }}>
            {["anuncio-referencia-preco", "anuncio-historico-fipe", "bia-parte4-modelos-mais-disputados", "bia-parte5-alto-padrao-marcas-de-luxo", "bia-parte6-tendencias"].map((n) => (
              <div key={n} style={{ scrollSnapAlign: "center", flex: "none" }}>
                <Fone src={`/vendas/${n}.png`} alt="" largura={158} />
              </div>
            ))}
          </div>
        </div>

        {/* 13 ── EXPERIMENTE AGORA (demo real) */}
        <div data-reveal style={{ ...REVEAL, padding: "8px 40px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: dados.ofertaDemo ? "1fr 292px" : "1fr", gap: 26, alignItems: "center" }}>
            <div>
              <div style={eyebrow}>Experimente agora — sem compromisso</div>
              <h3 style={{ font: `800 26px/1.15 ${TIT}`, color: "#0F1B2D", letterSpacing: "-.02em", margin: "0 0 14px" }}>Abra uma oferta real e veja o Copiloto trabalhar.</h3>
              <p style={{ font: `500 14px/1.6 ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Esta é uma oportunidade de verdade, abaixo da FIPE, com o Copiloto e a análise <b style={{ color: "#0F1B2D" }}>liberados</b> pra você sentir o produto — sem cadastro e sem sair daqui.</p>
              <p style={{ font: `700 15px/1.5 ${TIT}`, color: "#0F1B2D", margin: "0 0 18px" }}>Enquanto a maioria ainda está procurando… <span style={{ color: "#16A34A" }}>você já encontrou.</span></p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Sem cadastro", "Análise completa", "Oferta real de hoje"].map((x) => (
                  <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E4EAF0", borderRadius: 999, padding: "7px 13px", font: `700 12px ${CORPO}`, color: "#2f6446" }}>
                    <Check size={12} strokeWidth={3} color="#16A34A" /> {x}
                  </span>
                ))}
              </div>
            </div>
            {dados.ofertaDemo && (
              <div style={{ width: 292, flex: "none" }}>
                <ExperimenteDemo oferta={dados.ofertaDemo} />
              </div>
            )}
          </div>
        </div>

        {/* 14 ── quanto vale */}
        <div data-reveal style={{ ...REVEAL, margin: "0 24px 34px", padding: 34, background: "linear-gradient(180deg,#F7FAFC,#EFF4F8)", border: "1px solid #E4EAF0", borderRadius: 22, textAlign: "center" }}>
          <h3 style={{ font: `800 24px ${TIT}`, color: "#0F1B2D", margin: "0 0 12px" }}>Quanto vale isso?</h3>
          <p style={{ font: `500 15px ${CORPO}`, color: "#6A7686", margin: "0 0 14px" }}>Encontrar <b style={{ color: "#0F1B2D" }}>um único</b> veículo com R$ 5.000 de margem extra…</p>
          <div style={{ font: `800 30px ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>paga anos de assinatura.</div>
        </div>

        {/* 15 ── card de oferta escuro */}
        <div data-reveal style={{ ...REVEAL, padding: "6px 34px 40px" }} id="assinar">
          <div style={{ position: "relative", overflow: "hidden", background: "radial-gradient(400px 240px at 80% -20px,rgba(34,197,94,.22),transparent 65%),linear-gradient(165deg,#0E2A1A,#081410)", borderRadius: 24, padding: "32px 28px", boxShadow: "0 30px 70px -22px rgba(8,20,16,.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(53,208,127,.14)", color: "#35D07F", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}><Gem size={11} fill="#35D07F" strokeWidth={0} /> REPASSE LIVRE PRO</span>
              <span style={{ background: "rgba(217,119,46,.2)", color: "#F0A868", font: `800 10px ${CORPO}`, letterSpacing: ".1em", padding: "5px 11px", borderRadius: 999 }}>OFERTA POR TEMPO LIMITADO</span>
            </div>
            <h3 style={{ font: `800 24px/1.2 ${TIT}`, color: "#fff", textAlign: "center", margin: "0 0 14px" }}>Trave {dados.precoValor}{dados.precoIntervalo} — pra sempre.</h3>
            <p style={{ font: `500 13px/1.55 ${CORPO}`, color: "#9FB0C4", textAlign: "center", margin: "0 0 20px" }}>O BIA já monitora milhares de anúncios todos os dias — a inteligência está pronta pra trabalhar por você agora. Garanta o valor promocional e ele fica travado enquanto você for assinante.</p>
            {dados.precoAncoraTexto && <div style={{ textAlign: "center", font: `600 13px ${CORPO}`, color: "#7f93a3", textDecoration: "line-through" }}>De {dados.precoAncoraTexto}/mês</div>}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5, margin: "4px 0 14px" }}>
              <span style={{ font: `800 52px/1 ${TIT}`, color: "#fff" }}>{dados.precoValor}</span>
              <span style={{ font: `700 17px ${TIT}`, color: "#A9BBCB" }}>{dados.precoIntervalo}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(221,107,54,.16)", color: "#F0A868", padding: "9px 14px", borderRadius: 12, font: `700 13px ${CORPO}`, marginBottom: 20 }}>
              <Clock size={14} strokeWidth={2.2} /> Sua oferta expira em <ContadorTexto />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", padding: "18px 0", borderTop: "1px solid rgba(255,255,255,.1)", borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 20, font: `700 13px ${CORPO}`, color: "#D6E2EC" }}>
              {["BIA", "Copiloto", "Score", "Alertas", "Dashboard", "Comparativos"].map((x) => (
                <div key={x} style={{ display: "flex", gap: 8, alignItems: "center" }}><Check size={14} strokeWidth={3} color="#35D07F" /> {x}</div>
              ))}
            </div>
            <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : rotuloAssinar} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} className="rlv-cta" />
            <div style={{ textAlign: "center", marginTop: 14, font: `600 12px ${CORPO}`, color: "#8fa2b3", display: "flex", gap: 7, alignItems: "center", justifyContent: "center" }}><ShieldCheck size={14} strokeWidth={2} color="#35D07F" /> Sem fidelidade. Cancele quando quiser.</div>
            {dados.precoAncoraTexto && <div style={{ textAlign: "center", marginTop: 8, font: `500 12px ${CORPO}`, color: "#7f93a3" }}>Quando a oferta acabar, novos assinantes entram por <b style={{ color: "#A9BBCB" }}>{dados.precoAncoraTexto}/mês</b> — o seu fica travado.</div>}
            {dados.whatsappSuporte && (
              <a href={`https://wa.me/${dados.whatsappSuporte}?text=${encodeURIComponent("Olá! Fiquei com uma dúvida sobre o Repasse Livre PRO.")}`} target="_blank" rel="noreferrer" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(53,208,127,.14)", color: "#35D07F", padding: 12, borderRadius: 12, font: `700 13px ${CORPO}` }}>
                <MessageCircle size={16} strokeWidth={2} fill="#35D07F" /> Ficou com dúvida? Chame no WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* 16 ── FAQ */}
        <div data-reveal style={{ ...REVEAL, padding: "6px 34px 36px" }}>
          <h3 style={{ font: `800 24px ${TIT}`, color: "#0F1B2D", textAlign: "center", margin: "0 0 22px" }}>Perguntas frequentes</h3>
          {[
            { q: "Os anúncios são do Repasse Livre?", a: "Não. O Repasse Livre monitora e organiza oportunidades dos principais marketplaces automotivos do Brasil — OLX, Webmotors e Mercado Livre — transformando milhares de anúncios em inteligência de mercado." },
            { q: "Os veículos ficam abaixo da FIPE?", a: "Sim. Nossa plataforma identifica automaticamente anúncios abaixo da FIPE e mostra esse percentual de forma clara, pra facilitar a comparação e a decisão." },
            { q: "O que é o Copiloto?", a: "É o sistema de análise do Repasse Livre. Ele compara cada anúncio com veículos semelhantes monitorados pela plataforma e gera um parecer técnico baseado em dados reais do mercado." },
            { q: "O que é o BIA?", a: "O BIA (Banco de Inteligência Automotiva) é o motor de inteligência do Repasse Livre. Ele monitora continuamente o mercado pra transformar dados dispersos em informação estratégica." },
          ].map(({ q, a }) => (
            <details key={q} style={{ background: "#fff", border: "1px solid #EAEEF3", borderRadius: 16, padding: "16px 20px", marginBottom: 11 }}>
              <summary style={{ cursor: "pointer", listStyle: "none", font: `700 15px ${CORPO}`, color: "#0F1B2D" }}>{q}</summary>
              <p style={{ font: `500 13px/1.6 ${CORPO}`, color: "#6A7686", margin: "11px 0 0" }}>{a}</p>
            </details>
          ))}
        </div>

        {/* 17 ── CTA final escuro */}
        <div style={{ position: "relative", overflow: "hidden", padding: "44px 40px", background: "radial-gradient(500px 260px at 50% 0,rgba(34,197,94,.22),transparent 70%),linear-gradient(180deg,#0E2A1A,#081410)", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#35D07F" }}><Clock size={22} strokeWidth={2} /></div>
          <h3 style={{ font: `800 28px ${TIT}`, color: "#fff", margin: "0 0 10px", letterSpacing: "-.02em" }}>Quem compra melhor, <span style={{ color: "#35D07F" }}>lucra mais.</span></h3>
          <p style={{ font: `500 14px ${CORPO}`, color: "#9FB0C4", margin: "0 0 24px" }}>{c.finalSub}</p>
          <AcaoAssinatura estado={dados.estado} rotulo={dados.estado === "gerenciar" ? undefined : "ACESSAR O REPASSE LIVRE PRO"} checkoutUrl={dados.checkoutUrl} gerenciarUrl={dados.gerenciarUrl} className="rlv-cta rlv-cta--inline" />
          <div style={{ marginTop: 16, font: `500 12px ${CORPO}`, color: "#6f8598" }}>→ Enquanto você lia isto, mais carros entraram abaixo da FIPE.</div>
        </div>
      </div>
    </div>
  );
}
