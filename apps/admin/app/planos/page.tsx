import type { Metadata } from "next";
import Link from "next/link";
import { Gem, Unlock, ScanSearch, Radar, TrendingUp, Bell, Check, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Planos — Repasse Livre",
  description:
    "Inteligência de mercado pra quem compra carro pra revender: acesso às melhores ofertas abaixo da FIPE, análise do Copiloto, tendências e alertas.",
};

// 1º estágio (funil, sem checkout): CTA leva pro WhatsApp de vendas. Trocar o
// número pelo oficial quando definir (ou plugar o gateway no 2º estágio).
const WHATSAPP_VENDAS = "5599999999999";
const MSG = encodeURIComponent("Olá! Quero saber sobre o plano premium do Repasse Livre.");

const BENEFICIOS = [
  { Icone: Unlock, titulo: "Todas as ofertas liberadas", texto: "Inclusive as de maior margem abaixo da FIPE — as que dão o melhor repasse ficam trancadas no plano gratuito." },
  { Icone: ScanSearch, titulo: "Análise do Copiloto", texto: "Um parecer de especialista em cada anúncio: desconto real, posição no mercado, procedência e o que negociar." },
  { Icone: Radar, titulo: "Radar do Investidor", texto: "As melhores oportunidades do país filtradas pelo seu foco — sem garimpar página por página." },
  { Icone: TrendingUp, titulo: "Tendências de mercado", texto: "A inteligência da BIA: pra onde o preço de cada modelo está indo, por região, antes da concorrência." },
  { Icone: Bell, titulo: "Alertas instantâneos", texto: "Definiu “quero uma Duster até R$80k”? Recebe no WhatsApp assim que o anúncio entra — na frente de todo mundo." },
];

export default function PlanosPage() {
  return (
    <main className="planos">
      <Link href="/" className="planos-voltar">
        <ArrowLeft size={16} strokeWidth={2} /> Voltar às ofertas
      </Link>

      <section className="planos-hero">
        <span className="planos-selo">
          <Gem size={14} strokeWidth={2} /> Premium
        </span>
        <h1 className="planos-titulo">A inteligência de mercado de quem compra pra revender.</h1>
        <p className="planos-sub">
          O Repasse Livre mapeia dezenas de milhares de anúncios por semana e entrega, na sua mão, só o que
          está abaixo da FIPE — com o parecer que diz se vale e quanto negociar. O plano premium destrava tudo.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_VENDAS}?text=${MSG}`}
          target="_blank"
          rel="noreferrer"
          className="planos-cta"
        >
          <Gem size={17} strokeWidth={2} /> Quero ser premium
        </a>
        <p className="planos-cta-nota">Fale com a gente e comece a operar com vantagem hoje.</p>
      </section>

      <section className="planos-grade">
        {BENEFICIOS.map(({ Icone, titulo, texto }) => (
          <div key={titulo} className="planos-card">
            <span className="planos-card-icone">
              <Icone size={22} strokeWidth={2} />
            </span>
            <h2 className="planos-card-titulo">{titulo}</h2>
            <p className="planos-card-texto">{texto}</p>
          </div>
        ))}
      </section>

      <section className="planos-rodape">
        <div className="planos-rodape-lista">
          {["Todas as ofertas", "Copiloto", "Radar do Investidor", "Tendências", "Alertas"].map((item) => (
            <span key={item} className="planos-rodape-item">
              <Check size={14} strokeWidth={2.5} /> {item}
            </span>
          ))}
        </div>
        <a
          href={`https://wa.me/${WHATSAPP_VENDAS}?text=${MSG}`}
          target="_blank"
          rel="noreferrer"
          className="planos-cta"
        >
          <Gem size={17} strokeWidth={2} /> Quero ser premium
        </a>
      </section>
    </main>
  );
}
