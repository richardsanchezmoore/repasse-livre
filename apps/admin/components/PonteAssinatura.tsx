import Link from "next/link";
import { Gem, ArrowRight } from "lucide-react";

/**
 * Ponte de conversão na página do carro. O visitante (frio, vindo de Ads, ou orgânico do
 * SEO) acabou de ver a análise completa de UMA oportunidade — de graça. Aqui ancoramos o
 * valor ("tem dezenas assim toda semana") e o levamos pra /planos-slim, pra não perdê-lo
 * depois do "wow". Só renderiza pra NÃO-assinante (gate no chamador: !admin && !premium),
 * então cobre tanto o tráfego pago (destinos ADS, com premium liberado) quanto o SEO.
 */
export function PonteAssinatura() {
  return (
    <section
      style={{
        margin: "28px 0 8px",
        borderRadius: 20,
        padding: "clamp(22px,4vw,34px)",
        background:
          "radial-gradient(600px 300px at 82% -20%,rgba(0,200,69,.18),transparent 60%),linear-gradient(160deg,#0E2A1A,#081410)",
        color: "#fff",
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ flex: "1 1 320px", minWidth: 250 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            color: "#00c845",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          <Gem size={14} fill="#00c845" strokeWidth={0} /> Repasse Livre PRO
        </div>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(19px,2.6vw,25px)", lineHeight: 1.2, letterSpacing: "-.01em", margin: "0 0 10px" }}>
          Você viu a análise completa desta oportunidade — de graça.
        </h2>
        <p style={{ fontSize: "clamp(14px,1.6vw,16px)", lineHeight: 1.55, color: "#b9c6cf", margin: 0 }}>
          O Repasse Livre acha <b style={{ color: "#fff" }}>dezenas de carros abaixo da FIPE toda semana</b> — com essa
          análise pronta, no seu estado, na sua busca, com alerta na hora.
        </p>
      </div>
      <Link
        href="/planos-slim"
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          background: "linear-gradient(180deg,#00d24e,#00a038)",
          color: "#fff",
          fontWeight: 800,
          fontSize: 15,
          padding: "14px 24px",
          borderRadius: 999,
          textDecoration: "none",
          boxShadow: "0 12px 28px -8px rgba(0,200,69,.55)",
          whiteSpace: "nowrap",
        }}
      >
        Ver todas as oportunidades <ArrowRight size={18} strokeWidth={2.4} />
      </Link>
    </section>
  );
}
