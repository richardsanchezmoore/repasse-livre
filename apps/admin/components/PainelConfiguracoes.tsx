"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Loader2, Settings } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

/**
 * Configurações da plataforma — hub central (engrenagem). Grava no worker_config
 * (key/value): margem mínima de CAPTAÇÃO e limite PREMIUM do overlay. Feito pra ir
 * agregando itens com o tempo, sem migration por config.
 */
function CampoConfig({
  chave,
  valorInicial,
  titulo,
  tipo = "numero",
  placeholder,
  children,
}: {
  chave: string;
  valorInicial: string;
  titulo: string;
  /** "numero" = input % (coage p/ Number ao salvar); "texto" = string crua. */
  tipo?: "numero" | "texto";
  placeholder?: string;
  children: ReactNode;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    setSalvo(false);
    // Número → normaliza (String(Number)); texto → salva cru (trim).
    const aSalvar = tipo === "numero" ? String(Number(valor)) : valor.trim();
    iniciar(async () => {
      try {
        await salvarConfigWorker(chave, aSalvar);
        setSalvo(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px 22px", background: "#fff", marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{titulo}</h2>
      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13.5, lineHeight: 1.5 }}>{children}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: tipo === "texto" ? 320 : 140 }}>
          <input
            type={tipo === "texto" ? "text" : "number"}
            value={valor}
            placeholder={placeholder}
            {...(tipo === "numero" ? { min: 0, max: 100, step: 0.5 } : {})}
            onChange={(e) => {
              setValor(e.target.value);
              setSalvo(false);
            }}
            style={{ width: "100%", padding: tipo === "texto" ? "10px 12px" : "10px 30px 10px 12px", fontSize: tipo === "texto" ? 14 : 16, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", fontFamily: tipo === "texto" ? "ui-monospace, monospace" : "inherit" }}
          />
          {tipo === "numero" && <span style={{ position: "absolute", right: 12, top: 11, color: "#9ca3af", fontSize: 15 }}>%</span>}
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: salvando ? "#6b7280" : "#059669",
            border: "none",
            borderRadius: 10,
            cursor: salvando ? "default" : "pointer",
          }}
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <Check size={16} /> : null}
          {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar"}
        </button>
      </div>

      {erro && <p style={{ margin: "12px 0 0", color: "#dc2626", fontSize: 13.5 }}>{erro}</p>}
    </section>
  );
}

export function PainelConfiguracoes({ configs }: { configs: Record<string, string> }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Settings size={22} strokeWidth={1.9} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Configurações</h1>
      </header>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>Ajustes básicos da plataforma.</p>

      <CampoConfig chave="MARGEM_MINIMA_PERCENTUAL" valorInicial={configs["MARGEM_MINIMA_PERCENTUAL"] ?? "5"} titulo="Margem mínima de captação">
        Só captamos anúncios com pelo menos essa % <strong>abaixo da FIPE</strong>. Baixar (ex.: 3%) aumenta a base —
        a negociação costuma puxar o preço mais pra baixo, e um KM baixo já compensa a margem menor. Vale na próxima varredura.
      </CampoConfig>

      <CampoConfig chave="MARGEM_PREMIUM_PERCENTUAL" valorInicial={configs["MARGEM_PREMIUM_PERCENTUAL"] ?? "10"} titulo="Limite premium (overlay)">
        Ofertas com margem <strong>acima</strong> deste valor ficam atrás do overlay premium pra quem não é assinante —
        as melhores (ex.: 10%+) viram isca pro upgrade; Bronze abaixo disso fica livre. Vale quase na hora (cache da página).
      </CampoConfig>

      <CampoConfig
        chave="PRECO_ANCORA"
        valorInicial={configs["PRECO_ANCORA"] ?? ""}
        titulo="Preço-âncora da oferta (riscado)"
        tipo="texto"
        placeholder="249"
      >
        Valor <strong>riscado</strong> que aparece como “De R$ ___” na página de planos, ao lado do preço real
        de lançamento. É <strong>só visual</strong> (não cobra nada — quem cobra é o Price ID do Stripe acima);
        serve de âncora pra valorizar a oferta. Informe só o número em reais (ex.: <code>249</code>). Deixe em
        branco pra esconder o riscado. Vale na hora, sem deploy.
      </CampoConfig>

      <CampoConfig
        chave="DEMO_OPPORTUNITY_ID"
        valorInicial={configs["DEMO_OPPORTUNITY_ID"] ?? ""}
        titulo="Anúncio-vitrine da página de vendas"
        tipo="texto"
        placeholder="cole a URL do anúncio (ou o ID)"
      >
        A oferta que o visitante de campanha <strong>experimenta</strong> na /planos (seção “Experimente agora”):
        abre num modal com o <strong>Copiloto e o acesso liberados</strong> — a experiência completa, só pra
        <strong> este</strong> anúncio. Cole a <strong>URL</strong> do anúncio (ou o ID cru); extraímos o ID
        sozinhos. Escolha uma oferta boa e com foto. Em branco → cai no card de exemplo estático.
      </CampoConfig>

      <CampoConfig
        chave="WHATSAPP_SUPORTE"
        valorInicial={configs["WHATSAPP_SUPORTE"] ?? ""}
        titulo="WhatsApp de vendas/suporte"
        tipo="texto"
        placeholder="5548999998888"
      >
        Número que aparece no botão <strong>“Ficou com dúvida? Chame no WhatsApp”</strong> da página de planos.
        Use o formato internacional com <strong>DDI 55 + DDD + número</strong>, só dígitos (ex.: <code>5548999998888</code>).
        Deixe em branco pra esconder o botão. Vale na hora, sem deploy.
      </CampoConfig>
    </div>
  );
}
