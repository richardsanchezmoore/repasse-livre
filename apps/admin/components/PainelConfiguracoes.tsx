"use client";

import { useState, type ReactNode } from "react";
import { Settings, CreditCard, type LucideIcon } from "lucide-react";
import { CampoConfig } from "./CampoConfig";
import { PainelPagamentos } from "./PainelPagamentos";
import { PainelAnunciosAds } from "./PainelAnunciosAds";

/**
 * Painel de Configurações em ABAS (antes era uma tripa só):
 *  - Geral: ajustes básicos da plataforma (margens + janelas dos KPIs).
 *  - Pagamentos: gateways (Sistemas de Pagamento) + extras da página de vendas
 *    (âncora, anúncio-vitrine, WhatsApp).
 */
function BotaoAba({
  ativo,
  onClick,
  Icone,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  Icone: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        fontSize: 14.5,
        fontWeight: 700,
        color: ativo ? "#059669" : "#6b7280",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${ativo ? "#059669" : "transparent"}`,
        marginBottom: -1,
        cursor: "pointer",
      }}
    >
      <Icone size={17} strokeWidth={2} />
      {children}
    </button>
  );
}

export function PainelConfiguracoes({ configs }: { configs: Record<string, string> }) {
  const [aba, setAba] = useState<"geral" | "pagamentos">("geral");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        <BotaoAba ativo={aba === "geral"} onClick={() => setAba("geral")} Icone={Settings}>
          Geral
        </BotaoAba>
        <BotaoAba ativo={aba === "pagamentos"} onClick={() => setAba("pagamentos")} Icone={CreditCard}>
          Pagamentos
        </BotaoAba>
      </div>

      {aba === "geral" && (
        <>
          <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>Ajustes básicos da plataforma.</p>

          <CampoConfig chave="MARGEM_MINIMA_PERCENTUAL" valorInicial={configs["MARGEM_MINIMA_PERCENTUAL"] ?? "5"} titulo="Margem mínima de captação">
            Só captamos anúncios com pelo menos essa % <strong>abaixo da FIPE</strong>. Baixar (ex.: 3%) aumenta a base —
            a negociação costuma puxar o preço mais pra baixo, e um KM baixo já compensa a margem menor. Vale na próxima varredura.
          </CampoConfig>

          <CampoConfig chave="MARGEM_PREMIUM_PERCENTUAL" valorInicial={configs["MARGEM_PREMIUM_PERCENTUAL"] ?? "10"} titulo="Limite premium (overlay)">
            Ofertas com margem <strong>acima</strong> deste valor ficam atrás do overlay premium pra quem não é assinante —
            as melhores (ex.: 10%+) viram isca pro upgrade; Bronze abaixo disso fica livre. Vale quase na hora (cache da página).
          </CampoConfig>

          <CampoConfig
            chave="KPI_MAPEADAS_DIAS"
            valorInicial={configs["KPI_MAPEADAS_DIAS"] ?? "7"}
            titulo="KPIs — janela de “Ofertas mapeadas” e “Economia de mercado”"
            tipo="select"
            opcoes={[
              { valor: "7", rotulo: "7 dias" },
              { valor: "15", rotulo: "15 dias" },
              { valor: "30", rotulo: "30 dias" },
            ]}
          >
            Período das <strong>duas</strong> métricas do topo do board (andam juntas). A legenda acompanha:
            “Ofertas mapeadas · X dias” e “Economia de mercado · X dias”. Reflete no próximo carregamento do board.
          </CampoConfig>

          <CampoConfig
            chave="KPI_NOVOS_HORAS"
            valorInicial={configs["KPI_NOVOS_HORAS"] ?? "24"}
            titulo="KPIs — janela de “Novos”"
            tipo="select"
            opcoes={[
              { valor: "24", rotulo: "Últimas 24h" },
              { valor: "48", rotulo: "Últimas 48h" },
              { valor: "72", rotulo: "Últimas 72h" },
              { valor: "168", rotulo: "Últimos 7 dias" },
            ]}
          >
            Janela do KPI “Novos” (<strong>independente</strong> das outras). A legenda vira “Novos · últimas
            24h/48h/72h” ou “Novos · últimas 7 dias”. Reflete no próximo carregamento do board.
          </CampoConfig>
        </>
      )}

      {aba === "pagamentos" && (
        <>
          <PainelPagamentos configs={configs} />

          <CampoConfig
            chave="PRECO_MENSAL"
            valorInicial={configs["PRECO_MENSAL"] ?? "97"}
            titulo="Preço do plano (R$/mês)"
            tipo="texto"
            placeholder="97"
          >
            Valor <strong>exibido</strong> na página de planos (e base do “% OFF” do contador). Informe só o
            número em reais (ex.: <code>97</code>). Deve <strong>bater com o que o gateway ativo cobra</strong>
            (ex.: o preço do produto na Cakto). Se o Stripe for o ativo, o preço vem do próprio Stripe. Reflete
            em até 5 min.
          </CampoConfig>

          <h2 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 700 }}>Extras da página de vendas</h2>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>Preço-âncora e contato.</p>

          <CampoConfig
            chave="PRECO_ANCORA"
            valorInicial={configs["PRECO_ANCORA"] ?? ""}
            titulo="Preço-âncora da oferta (riscado)"
            tipo="texto"
            placeholder="249"
          >
            Valor <strong>riscado</strong> que aparece como “De R$ ___” na página de planos, ao lado do preço real
            de lançamento. É <strong>só visual</strong> (não cobra nada — quem cobra é o gateway ativo acima);
            serve de âncora pra valorizar a oferta e calcula o “% OFF” do contador. Informe só o número em reais
            (ex.: <code>249</code>). Deixe em branco pra esconder o riscado.
          </CampoConfig>

          <CampoConfig
            chave="WHATSAPP_SUPORTE"
            valorInicial={configs["WHATSAPP_SUPORTE"] ?? ""}
            titulo="WhatsApp de vendas/suporte"
            tipo="texto"
            placeholder="5548999998888"
          >
            Número que aparece no botão <strong>“Ficou com dúvida? Chame no WhatsApp”</strong> da página de planos
            (e no “gerenciar assinatura” do Repasse Livre PRO). Formato internacional <strong>DDI 55 + DDD + número</strong>,
            só dígitos (ex.: <code>5548999998888</code>). Deixe em branco pra esconder. Vale na hora.
          </CampoConfig>

          <h2 style={{ margin: "20px 0 6px", fontSize: 18, fontWeight: 700 }}>Anúncios direcionados para ADS</h2>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>
            Os anúncios com a área premium liberada: o âncora que alimenta as páginas de venda e os destinos
            das campanhas.
          </p>
          <PainelAnunciosAds configs={configs} />
        </>
      )}
    </div>
  );
}
