import type { Metadata } from "next";
import { Target, Lock, Zap, Check, Clock } from "lucide-react";
import { FormularioEnvio } from "@/components/FormularioEnvio";
import { RastreioEvento } from "@/components/RastreioEvento";
import { enviarAnuncioVenda } from "@/app/vender/actions";
import { buscarCheckoutAnunciar, buscarPisoMargem, buscarPrecoAnunciar } from "@/lib/configWorker";
import { buscarKpisTopo } from "@/lib/kpisTopo";
import { buscarNumerosRegionais } from "@/lib/numerosRegionais";

export const metadata: Metadata = {
  title: "Anuncie seu carro abaixo da FIPE — Repasse Livre",
  description:
    "Precisa vender com liquidez? Anuncie seu carro na plataforma referência em carros abaixo da FIPE — visto por um público que procura exatamente esse tipo de oportunidade.",
  robots: { index: false, follow: false }, // landing de teste (tráfego pago), fora do índice
};

export const revalidate = 3600;

const TIT = "Poppins, system-ui, sans-serif";
const CORPO = "Manrope, system-ui, sans-serif";

const DIFERENCIAIS = [
  {
    icone: Target,
    titulo: "Público qualificado",
    texto: "Aqui não tem curioso passeando. Quem entra procura carro abaixo da FIPE pra fechar negócio.",
  },
  {
    icone: Lock,
    titulo: "Exclusiva abaixo da FIPE",
    texto: "Só entram carros abaixo da tabela. O seu fica no lugar certo — não afogado entre milhares de anúncios.",
  },
  {
    icone: Zap,
    titulo: "Referência em liquidez",
    texto: "Uma plataforma pensada pra girar rápido — pra quem precisa vender, não pra quem só está de vitrine.",
  },
];

export default async function VenderPage() {
  const [kpis, checkout, piso, preco, numerosRegionais] = await Promise.all([buscarKpisTopo(), buscarCheckoutAnunciar(), buscarPisoMargem(), buscarPrecoAnunciar(), buscarNumerosRegionais(["RS", "SC", "PR"])]);
  const siteKeyTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const milhar = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
  // Totais do Sul (PR+RS+SC) pro banner "ao vivo" — sem GEO, agrega os 3 estados.
  const novasTotal = numerosRegionais.reduce((s, n) => s + n.novas24h, 0);
  const abaixoTotal = numerosRegionais.reduce((s, n) => s + n.abaixoFipe, 0);

  return (
    <main style={{ minHeight: "100vh", background: "#F4F7F5", color: "#0F1B2D", fontFamily: CORPO }}>
      {/* Dispara ver_oferta → ViewContent (o Meta otimiza a campanha de vendedor por isso). */}
      <RastreioEvento evento="ver_oferta" params={{ pagina: "vender" }} />
      {/* esconde o marcador nativo do <details> + pulsação do "ao vivo" */}
      <style>{`.vender-acc > summary{list-style:none}.vender-acc > summary::-webkit-details-marker{display:none}@keyframes rlPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}`}</style>

      {/* Barra "ao vivo" — prova de demanda logo na aterrissagem, sem GEO (agrega PR+RS+SC). */}
      <div style={{ background: "#0E2A1A", color: "#EAF3EE", textAlign: "center", padding: "10px 16px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", font: `700 clamp(12px,1.7vw,13.5px) ${CORPO}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 0 3px rgba(34,197,94,.25)", animation: "rlPulse 1.6s ease-in-out infinite", flexShrink: 0 }} />
          {novasTotal > 0 ? (
            <span><b style={{ color: "#5AE08C" }}>+{milhar(novasTotal)} carros abaixo da FIPE</b> entraram no Sul (PR·RS·SC) nas últimas 24h</span>
          ) : (
            <span><b style={{ color: "#5AE08C" }}>{milhar(abaixoTotal)} carros abaixo da FIPE</b> à procura de dono no Sul — PR · RS · SC</span>
          )}
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(32px,6vw,64px) clamp(20px,5vw,40px)" }}>
        {/* Hero */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(22,163,74,.1)", color: "#16A34A", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 18 }}>
          Compradores procurando agora
        </div>
        <h1 style={{ font: `800 clamp(28px,5vw,42px)/1.1 ${TIT}`, letterSpacing: "-.02em", margin: "0 0 16px", textWrap: "balance" }}>
          Seu carro na frente de quem <span style={{ color: "#16A34A" }}>realmente compra.</span>
        </h1>
        <p style={{ font: `500 clamp(15px,2vw,18px)/1.6 ${CORPO}`, color: "#4a5568", margin: "0 0 22px", maxWidth: 560 }}>
          No OLX e no Facebook seu carro se perde entre curiosos que só olham. Aqui, ele é visto por lojistas, investidores e repassadores — compradores de verdade, com <b style={{ color: "#16A34A" }}>dinheiro na mão</b>.
        </p>

        {/* Prova visual: a plataforma onde o anúncio entra */}
        <figure style={{ margin: "0 0 30px" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E4EAE6", boxShadow: "0 24px 55px -26px rgba(15,27,45,.4)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vender/plataforma-home.jpg"
              alt="A plataforma Repasse Livre — vitrine de carros abaixo da FIPE que os compradores acompanham"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
          <figcaption style={{ font: `600 12.5px ${CORPO}`, color: "#8a97a0", textAlign: "center", margin: "10px 0 0" }}>
            É aqui que seu carro entra — na vitrine que os compradores acompanham todo dia.
          </figcaption>
        </figure>

        {/* Diferenciais */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 30 }}>
          {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} style={{ background: "#fff", border: "1px solid #E4EAE6", borderRadius: 16, padding: "18px 18px" }}>
              <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: 10, background: "rgba(22,163,74,.12)", color: "#16A34A", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icone size={20} strokeWidth={2} />
              </span>
              <div style={{ font: `800 16px ${TIT}`, margin: "0 0 6px" }}>{titulo}</div>
              <p style={{ font: `500 13.5px/1.5 ${CORPO}`, color: "#5a6572", margin: 0 }}>{texto}</p>
            </div>
          ))}
        </div>

        {/* Reforço de VALOR pré-CTA — no fim do funil vende vantagem, não dor
            (a dor já foi estabelecida no hero). Sem prometer venda. */}
        <div style={{ background: "#0E2A1A", color: "#EAF3EE", borderRadius: 18, padding: "clamp(22px,4vw,30px)", marginBottom: 30 }}>
          <p style={{ font: `600 clamp(15px,2vw,17px)/1.6 ${CORPO}`, margin: 0 }}>
            Seu carro numa vitrine <b style={{ color: "#5AE08C" }}>só de carros abaixo da FIPE</b> — a categoria que lojistas, investidores e repassadores procuram todo dia.
          </p>
          <p style={{ font: `500 13.5px/1.6 ${CORPO}`, color: "#9FBFAC", margin: "10px 0 0" }}>
            Você coloca seu carro exatamente onde o comprador certo já está olhando.
          </p>
        </div>

        {/* Preço + accordion com o formulário */}
        <div style={{ background: "#fff", border: "1px solid #E4EAE6", borderRadius: 18, padding: "clamp(20px,4vw,28px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ font: `800 clamp(30px,6vw,40px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>{preco}</span>
            <span style={{ font: `600 14px ${CORPO}`, color: "#5a6572" }}>pra publicar</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 18 }}>
            {["Paga uma única vez", "Sem vencimento", "Publicação imediata"].map((x) => (
              <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `700 12.5px ${CORPO}`, color: "#2f6446" }}>
                <Check size={14} strokeWidth={3} color="#16A34A" /> {x}
              </span>
            ))}
          </div>

          <details className="vender-acc">
            <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#16A34A", color: "#fff", padding: "15px 22px", borderRadius: 12, font: `800 15px ${TIT}` }}>
              Qual carro você quer vender? →
            </summary>
            <div style={{ marginTop: 20 }}>
              <p style={{ font: `500 13px/1.5 ${CORPO}`, color: "#5a6572", margin: "0 0 16px" }}>
                Seu carro precisa estar <b>pelo menos {piso}% abaixo da FIPE</b> pra entrar — é o que atrai o comprador certo. A gente confirma a FIPE na hora.
              </p>
              <FormularioEnvio
                siteKeyTurnstile={siteKeyTurnstile}
                acaoEnvio={enviarAnuncioVenda}
                mensagemSucesso="Anúncio recebido! ✅ Falta só o pagamento via PIX pra publicar — em instantes você garante seu lugar na plataforma."
                checkoutBaseUrl={checkout?.url}
                margemMinima={piso}
                precoLabel={preco}
              />
            </div>
          </details>
        </div>

        {/* KPIs discretos = autoridade (não o herói) */}
        <p style={{ font: `600 12.5px ${CORPO}`, color: "#8a97a0", textAlign: "center", margin: "26px 0 0" }}>
          {milhar(kpis.mapeados)} ofertas mapeadas · 4 fontes monitoradas · plataforma referência em carros abaixo da FIPE
        </p>

        {/* Prova viva grudada no CTA — números por estado (RS/SC/PR), fundo branco
            pra contrastar com o body cinza. Mesmos dados da /planos-slim. */}
        {numerosRegionais.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            {numerosRegionais.map((n) => (
              <div key={n.uf} style={{ flex: "1 1 150px", background: "#fff", border: "1px solid #E4EAE6", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ font: `800 clamp(22px,3vw,28px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em", lineHeight: 1 }}>{milhar(n.abaixoFipe)}</div>
                <div style={{ font: `600 12.5px ${CORPO}`, color: "#3a4652", marginTop: 3 }}>
                  carros abaixo da FIPE {n.preposicao} <b style={{ color: "#1f2937" }}>{n.nome}</b>
                </div>
                {n.novas24h > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, font: `600 11.5px ${CORPO}`, color: "#2f6446", marginTop: 5 }}>
                    <Clock size={12} strokeWidth={2.2} />
                    <span><b style={{ fontSize: 14 }}>+{milhar(n.novas24h)}</b> nas últimas 24h</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
