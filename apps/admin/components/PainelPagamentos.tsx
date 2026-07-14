"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, CreditCard } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

/**
 * Seção "Sistemas de Pagamento" — registro de gateways. Cada um fica CODADO e
 * togglável: liga UM por vez (GATEWAY_ATIVO), que é o que o CTA de assinatura
 * usa. Trocar de gateway (Stripe ↔ Cakto ↔ Asaas) vira um clique, sem perder
 * nenhuma integração. Segredos (chaves) vivem no ambiente; aqui só o que é
 * não-secreto + o interruptor. Ver project_repasse_livre_gateway_pagamento_woovi.
 */

interface Gateway {
  chave: string;
  nome: string;
  desc: string;
  configKey?: string;
  configLabel?: string;
  configPlaceholder?: string;
  envs?: string;
  emBreve?: boolean;
}

const GATEWAYS: Gateway[] = [
  {
    chave: "cakto",
    nome: "Cakto",
    desc: "Pix recorrente (Pix Automático), aceita CPF. Taxa Pix 0% + R$ 2,49. Webhook em /api/webhooks/cakto.",
    configKey: "CAKTO_CHECKOUT_URL",
    configLabel: "URL de checkout do Repasse Livre PRO",
    configPlaceholder: "https://pay.cakto.com.br/…",
    envs: "CAKTO_CLIENT_ID · CAKTO_CLIENT_SECRET · CAKTO_WEBHOOK_SECRET",
  },
  {
    chave: "ticto",
    nome: "Ticto",
    desc: "Merchant-of-record (checkout hospedado, aceita CPF). Assinatura recorrente + sck no tracking (casa o user_id/claim no webhook). Webhook em /api/webhooks/ticto. Suporte bom.",
    configKey: "TICTO_CHECKOUT_URL",
    configLabel: "URL de checkout do Repasse Livre PRO",
    configPlaceholder: "https://pay.ticto.com.br/…",
    envs: "TICTO_WEBHOOK_TOKEN",
  },
  {
    chave: "stripe",
    nome: "Stripe",
    desc: "Cartão internacional recorrente. Codado (checkout + portal + webhook); requer chaves ativas.",
    configKey: "STRIPE_PRICE_ID",
    configLabel: "Price ID",
    configPlaceholder: "price_…",
    envs: "STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET",
  },
  {
    chave: "asaas",
    nome: "Asaas",
    desc: "Gateway/PSP: Pix + assinaturas nativas, aceita CPF, externalReference (casa o user_id no webhook). API-driven (/api/assinatura/asaas). ⚠️ Pix Automático (débito recorrente) exige CNPJ 6+ meses; com CPF é Pix manual/mês ou cartão.",
    envs: "ASAAS_API_KEY · ASAAS_AMBIENTE (sandbox/producao) · ASAAS_WEBHOOK_TOKEN",
  },
];

function Interruptor({ ligado, onToggle, disabled }: { ligado: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: disabled ? "default" : "pointer",
        background: ligado ? "#16a34a" : "#cbd5e1",
        position: "relative",
        transition: "background 0.15s ease",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: ligado ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

function CampoGateway({ chave, label, valorInicial, placeholder }: { chave: string; label: string; valorInicial: string; placeholder?: string }) {
  const [valor, setValor] = useState(valorInicial);
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setSalvo(false);
    iniciar(async () => {
      await salvarConfigWorker(chave, valor.trim());
      setSalvo(true);
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#6b7280", marginBottom: 5 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          value={valor}
          placeholder={placeholder}
          onChange={(e) => {
            setValor(e.target.value);
            setSalvo(false);
          }}
          style={{ flex: 1, minWidth: 220, padding: "9px 12px", fontSize: 13.5, border: "1px solid #d1d5db", borderRadius: 9, outline: "none", fontFamily: "ui-monospace, monospace" }}
        />
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, color: "#fff", background: salvando ? "#6b7280" : "#059669", border: "none", borderRadius: 9, cursor: salvando ? "default" : "pointer" }}
        >
          {salvando ? <Loader2 size={15} className="animate-spin" /> : salvo ? <Check size={15} /> : null}
          {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export function PainelPagamentos({ configs }: { configs: Record<string, string> }) {
  const [ativo, setAtivo] = useState(configs["GATEWAY_ATIVO"] ?? "");
  const [salvando, iniciar] = useTransition();

  function alternar(chave: string) {
    const novo = ativo === chave ? "" : chave; // desligar o ativo = nenhum
    iniciar(async () => {
      await salvarConfigWorker("GATEWAY_ATIVO", novo);
      setAtivo(novo);
    });
  }

  return (
    <div style={{ padding: "0 0 8px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <CreditCard size={20} strokeWidth={1.9} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sistemas de Pagamento</h2>
      </header>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>
        Ligue <strong>um</strong> gateway por vez — é o que o botão de assinatura usa. Os demais ficam codados e prontos
        pra reativar num clique. As chaves secretas ficam no ambiente (Vercel), não aqui.
      </p>

      {GATEWAYS.map((gw) => {
        const ehAtivo = ativo === gw.chave;
        return (
          <section
            key={gw.chave}
            style={{
              border: `1px solid ${ehAtivo ? "#16a34a" : "#e5e7eb"}`,
              background: ehAtivo ? "#f0fdf4" : "#fff",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 14,
              opacity: gw.emBreve ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{gw.nome}</h2>
                {ehAtivo && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#0a5d2c", background: "#dcfce7", padding: "2px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    Ativo
                  </span>
                )}
                {gw.emBreve && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#64748b", background: "#f1f5f9", padding: "2px 9px", borderRadius: 999, textTransform: "uppercase" }}>
                    Em breve
                  </span>
                )}
              </div>
              <Interruptor ligado={ehAtivo} onToggle={() => alternar(gw.chave)} disabled={gw.emBreve || salvando} />
            </div>

            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "#6b7280", lineHeight: 1.5 }}>{gw.desc}</p>

            {gw.configKey && !gw.emBreve && (
              <CampoGateway
                chave={gw.configKey}
                label={gw.configLabel ?? gw.configKey}
                valorInicial={configs[gw.configKey] ?? ""}
                placeholder={gw.configPlaceholder}
              />
            )}

            {gw.envs && (
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#9ca3af" }}>
                Segredos no ambiente: <code>{gw.envs}</code>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
