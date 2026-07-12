"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

/**
 * Campo de configuração key/value (grava no worker_config). Reusado pelas abas do
 * painel de Configurações. tipo: "numero" (input %), "texto" (string crua) ou
 * "select" (dropdown com `opcoes`).
 */
export function CampoConfig({
  chave,
  valorInicial,
  titulo,
  tipo = "numero",
  placeholder,
  opcoes,
  children,
}: {
  chave: string;
  valorInicial: string;
  titulo: string;
  tipo?: "numero" | "texto" | "select";
  placeholder?: string;
  opcoes?: { valor: string; rotulo: string }[];
  children: ReactNode;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    setSalvo(false);
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
        <div style={{ position: "relative", width: tipo === "texto" ? 320 : tipo === "select" ? 200 : 140 }}>
          {tipo === "select" ? (
            <select
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setSalvo(false);
              }}
              style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", background: "#fff", cursor: "pointer" }}
            >
              {(opcoes ?? []).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          ) : (
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
          )}
          {tipo === "numero" && <span style={{ position: "absolute", right: 12, top: 11, color: "#9ca3af", fontSize: 15 }}>%</span>}
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#fff", background: salvando ? "#6b7280" : "#059669", border: "none", borderRadius: 10, cursor: salvando ? "default" : "pointer" }}
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <Check size={16} /> : null}
          {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar"}
        </button>
      </div>

      {erro && <p style={{ margin: "12px 0 0", color: "#dc2626", fontSize: 13.5 }}>{erro}</p>}
    </section>
  );
}
