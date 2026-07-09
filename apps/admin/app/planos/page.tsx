import type { Metadata } from "next";
import Link from "next/link";
import { Gem, Unlock, ScanSearch, Radar, TrendingUp, Bell, Check, ArrowLeft } from "lucide-react";
import { AcaoAssinatura } from "@/components/AcaoAssinatura";
import { BotaoWhatsappSuporte } from "@/components/BotaoWhatsappSuporte";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { buscarWhatsappSuporte } from "@/lib/configWorker";

export const metadata: Metadata = {
  title: "Planos — Repasse Livre",
  description:
    "Inteligência de mercado pra quem compra carro pra revender: acesso às melhores ofertas abaixo da FIPE, análise do Copiloto, tendências e alertas.",
};

const BENEFICIOS = [
  { Icone: Unlock, titulo: "Todas as ofertas liberadas", texto: "Inclusive as de maior margem abaixo da FIPE — as que dão o melhor repasse ficam trancadas no plano gratuito." },
  { Icone: ScanSearch, titulo: "Análise do Copiloto", texto: "Um parecer de especialista em cada anúncio: desconto real, posição no mercado, procedência e o que negociar." },
  { Icone: Radar, titulo: "Radar do Investidor", texto: "As melhores oportunidades do país filtradas pelo seu foco — sem garimpar página por página." },
  { Icone: TrendingUp, titulo: "Tendências de mercado", texto: "A inteligência da BIA: pra onde o preço de cada modelo está indo, por região, antes da concorrência." },
  { Icone: Bell, titulo: "Alertas instantâneos", texto: "Definiu “quero uma Duster até R$80k”? Recebe no WhatsApp assim que o anúncio entra — na frente de todo mundo." },
];

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ assinatura?: string }>;
}) {
  const { assinatura } = await searchParams;
  const [usuario, preco, whatsappSuporte] = await Promise.all([
    obterUsuarioAtual(),
    buscarPrecoExibicao(),
    buscarWhatsappSuporte(),
  ]);
  // Tem um registro de assinatura no Stripe (qualquer status) → botão Gerenciar.
  const temAssinaturaStripe = Boolean(usuario?.assinaturaStatus);
  const estado: "entrar" | "assinar" | "gerenciar" = !usuario
    ? "entrar"
    : temAssinaturaStripe
      ? "gerenciar"
      : "assinar";
  const jaPremium = Boolean(usuario?.premium);

  return (
    <main className="planos">
      <Link href="/" className="planos-voltar">
        <ArrowLeft size={16} strokeWidth={2} /> Voltar às ofertas
      </Link>

      {assinatura === "sucesso" && (
        <div className="planos-aviso planos-aviso-ok">
          <Check size={16} strokeWidth={2.5} /> Pagamento recebido! Seu acesso premium é liberado em
          instantes — se ainda não apareceu, recarregue a página em alguns segundos.
        </div>
      )}
      {assinatura === "cancelado" && (
        <div className="planos-aviso">Checkout cancelado. Quando quiser, é só voltar e assinar.</div>
      )}

      <section className="planos-hero">
        <span className="planos-selo">
          <Gem size={14} strokeWidth={2} /> Premium
        </span>
        <h1 className="planos-titulo">A inteligência de mercado de quem compra pra revender.</h1>
        <p className="planos-sub">
          O Repasse Livre mapeia dezenas de milhares de anúncios por semana e entrega, na sua mão, só o que
          está abaixo da FIPE — com o parecer que diz se vale e quanto negociar. O plano premium destrava tudo.
        </p>
        <p className="planos-preco">
          <strong>{preco.valor}</strong>
          <span>{preco.intervalo}</span>
        </p>
        <AcaoAssinatura estado={estado} />
        <p className="planos-cta-nota">
          {jaPremium
            ? "Você já é premium. Gerencie ou cancele quando quiser."
            : "Cancele quando quiser, direto no seu painel de assinatura."}
        </p>
        {whatsappSuporte && <BotaoWhatsappSuporte numero={whatsappSuporte} />}
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
        <AcaoAssinatura estado={estado} />
      </section>
    </main>
  );
}
