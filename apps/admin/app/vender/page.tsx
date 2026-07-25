import type { Metadata } from "next";
import { Target, Lock, Zap, Check } from "lucide-react";
import { FormularioEnvio } from "@/components/FormularioEnvio";
import { enviarAnuncioVenda } from "@/app/vender/actions";
import { buscarKpisTopo } from "@/lib/kpisTopo";

export const metadata: Metadata = {
  title: "Anuncie seu carro abaixo da FIPE — Repasse Livre",
  description:
    "Precisa vender com liquidez? Anuncie seu carro na plataforma referência em carros abaixo da FIPE — visto por um público que procura exatamente esse tipo de oportunidade.",
  robots: { index: false, follow: false }, // landing de teste (tráfego pago), fora do índice
};

export const revalidate = 3600;

const TIT = "Poppins, system-ui, sans-serif";
const CORPO = "Manrope, system-ui, sans-serif";
const PRECO = "R$ 29,90";

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
  const kpis = await buscarKpisTopo();
  const siteKeyTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const milhar = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

  return (
    <main style={{ minHeight: "100vh", background: "#F4F7F5", color: "#0F1B2D", fontFamily: CORPO }}>
      {/* esconde o marcador nativo do <details> */}
      <style>{`.vender-acc > summary{list-style:none}.vender-acc > summary::-webkit-details-marker{display:none}`}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(32px,6vw,64px) clamp(20px,5vw,40px)" }}>
        {/* Hero */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(22,163,74,.1)", color: "#16A34A", padding: "6px 14px", borderRadius: 999, font: `800 11px ${CORPO}`, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 18 }}>
          Anuncie seu carro abaixo da FIPE
        </div>
        <h1 style={{ font: `800 clamp(28px,5vw,42px)/1.1 ${TIT}`, letterSpacing: "-.02em", margin: "0 0 16px", textWrap: "balance" }}>
          Precisa de liquidez? Anuncie onde o comprador certo <span style={{ color: "#16A34A" }}>já está procurando.</span>
        </h1>
        <p style={{ font: `500 clamp(15px,2vw,18px)/1.6 ${CORPO}`, color: "#4a5568", margin: "0 0 30px", maxWidth: 560 }}>
          Seu carro abaixo da FIPE entra numa vitrine curada — vista por quem caça exatamente esse tipo de oportunidade. Não é mais um anúncio perdido na multidão.
        </p>

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

        {/* Por que aqui e não só no OLX (honesto — sem prometer venda) */}
        <div style={{ background: "#0E2A1A", color: "#EAF3EE", borderRadius: 18, padding: "clamp(22px,4vw,30px)", marginBottom: 30 }}>
          <p style={{ font: `600 clamp(15px,2vw,17px)/1.6 ${CORPO}`, margin: 0 }}>
            No OLX e no Facebook seu carro compete com lojista, anúncio destaque e milhões de outros. Aqui, por <b style={{ color: "#5AE08C" }}>{PRECO}</b>, ele entra num clube curado de carros <b style={{ color: "#5AE08C" }}>abaixo da FIPE</b> — visto por caçadores de oportunidade.
          </p>
          <p style={{ font: `500 13.5px/1.6 ${CORPO}`, color: "#9FBFAC", margin: "12px 0 0" }}>
            Você não compra promessa de venda — compra o <b style={{ color: "#EAF3EE" }}>lugar certo</b> pra ser visto por quem realmente quer comprar abaixo da tabela.
          </p>
        </div>

        {/* Preço + accordion com o formulário */}
        <div style={{ background: "#fff", border: "1px solid #E4EAE6", borderRadius: 18, padding: "clamp(20px,4vw,28px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ font: `800 clamp(30px,6vw,40px) ${TIT}`, color: "#16A34A", letterSpacing: "-.02em" }}>{PRECO}</span>
            <span style={{ font: `600 14px ${CORPO}`, color: "#5a6572" }}>pra publicar · sem mensalidade</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 18 }}>
            {["Só carros abaixo da FIPE", "Sem letra miúda", "Você administra seu anúncio"].map((x) => (
              <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `700 12.5px ${CORPO}`, color: "#2f6446" }}>
                <Check size={14} strokeWidth={3} color="#16A34A" /> {x}
              </span>
            ))}
          </div>

          <details className="vender-acc">
            <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#16A34A", color: "#fff", padding: "15px 22px", borderRadius: 12, font: `800 15px ${TIT}` }}>
              Anunciar meu carro →
            </summary>
            <div style={{ marginTop: 20 }}>
              <p style={{ font: `500 13px/1.5 ${CORPO}`, color: "#5a6572", margin: "0 0 16px" }}>
                Seu carro precisa estar <b>pelo menos 5% abaixo da FIPE</b> pra entrar — é o que atrai o comprador certo. A gente confirma a FIPE na hora.
              </p>
              <FormularioEnvio
                siteKeyTurnstile={siteKeyTurnstile}
                acaoEnvio={enviarAnuncioVenda}
                mensagemSucesso="Anúncio recebido! ✅ Falta só o pagamento via PIX pra publicar — em instantes você garante seu lugar na plataforma."
              />
            </div>
          </details>
        </div>

        {/* KPIs discretos = autoridade (não o herói) */}
        <p style={{ font: `600 12.5px ${CORPO}`, color: "#8a97a0", textAlign: "center", margin: "26px 0 0" }}>
          {milhar(kpis.mapeados)} ofertas mapeadas · 4 fontes monitoradas · plataforma referência em carros abaixo da FIPE
        </p>
      </div>
    </main>
  );
}
