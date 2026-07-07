"use client";

import { useState } from "react";
import type { MercadoEscopo } from "@/lib/bia/tipos";

/**
 * Linha "Preço vs. mercado" da ficha do Copiloto: mostra o PERCENTIL concreto
 * ("Melhor que X% dos anúncios") em vez da estrela abstrata, com uma aba
 * Estado/Brasil que troca o escopo do cálculo (o score do topo segue no padrão;
 * a aba só realça a posição por escopo). Ver project_repasse_livre_copiloto_compra_instrumentacao.
 */
function rotuloCurto(e: MercadoEscopo): string {
  return e.chave === "brasil" ? "Brasil" : e.rotulo.replace(/^em\s+/, "");
}

export function PrecoVsMercado({ escopos, padrao }: { escopos: MercadoEscopo[]; padrao: string }) {
  const inicial = escopos.find((e) => e.chave === padrao) ?? escopos[0];
  const [sel, setSel] = useState<string>(inicial?.chave ?? "");
  const atual = escopos.find((e) => e.chave === sel) ?? inicial;
  if (!atual) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
        Melhor que {atual.melhorQue}% dos {atual.total} anúncios {atual.rotulo}
      </span>
      {escopos.length > 1 && (
        <div style={{ display: "inline-flex", gap: 2, background: "#f3f4f6", borderRadius: 999, padding: 2 }}>
          {escopos.map((e) => {
            const ativo = e.chave === sel;
            return (
              <button
                key={e.chave}
                type="button"
                onClick={() => setSel(e.chave)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: ativo ? "#0a5d2c" : "transparent",
                  color: ativo ? "#fff" : "#6b7280",
                }}
              >
                {rotuloCurto(e)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
