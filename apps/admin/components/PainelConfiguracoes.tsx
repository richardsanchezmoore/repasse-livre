"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Settings } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

const MARGEM_PADRAO = "5";

/**
 * Configurações da plataforma — hub central (engrenagem). Começa com a margem
 * mínima de captação; feito pra ir agregando itens básicos com o tempo. Grava no
 * worker_config (key/value), o mesmo que o Motor de Descoberta lê no início de
 * cada varredura — sem migration pra cada config nova.
 */
export function PainelConfiguracoes({ configs }: { configs: Record<string, string> }) {
  const [margem, setMargem] = useState(configs["MARGEM_MINIMA_PERCENTUAL"] ?? MARGEM_PADRAO);
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      try {
        await salvarConfigWorker("MARGEM_MINIMA_PERCENTUAL", String(Number(margem)).trim());
        setSalvo(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Settings size={22} strokeWidth={1.9} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Configurações</h1>
      </header>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>Ajustes básicos da plataforma.</p>

      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px 22px", background: "#fff" }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Margem mínima de captação</h2>
        <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13.5, lineHeight: 1.5 }}>
          Só captamos anúncios com pelo menos essa % <strong>abaixo da FIPE</strong>. Baixar (ex.: 3%) aumenta
          a base — a negociação costuma puxar o preço mais pra baixo, e um KM baixo já compensa a margem menor.
          Vale na próxima varredura.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 140 }}>
            <input
              type="number"
              value={margem}
              min={0}
              max={100}
              step={0.5}
              onChange={(e) => {
                setMargem(e.target.value);
                setSalvo(false);
              }}
              style={{
                width: "100%",
                padding: "10px 30px 10px 12px",
                fontSize: 16,
                border: "1px solid #d1d5db",
                borderRadius: 10,
                outline: "none",
              }}
            />
            <span style={{ position: "absolute", right: 12, top: 11, color: "#9ca3af", fontSize: 15 }}>%</span>
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
    </div>
  );
}
