import type { FactSheet } from "@/lib/bia/tipos";

function Estrelas({ n }: { n: number | null }) {
  if (n == null) return <span style={{ color: "#9ca3af", fontSize: "0.85em" }}>N/D</span>;
  return (
    <span style={{ letterSpacing: 1 }} aria-label={`${n} de 5`}>
      <span style={{ color: "#f59e0b" }}>{"★".repeat(n)}</span>
      <span style={{ color: "#e5e7eb" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

function corScore(score: number | null): string {
  if (score == null) return "#6b7280";
  if (score >= 70) return "#059669";
  if (score >= 45) return "#d97706";
  return "#dc2626";
}

/**
 * Fichário técnico do Copiloto de Compra — o parecer de analista. Consome o
 * FactSheet da BIA Engine (nada é calculado aqui; só renderiza). Prévia
 * admin-only por ora — o gate Premium substitui a checagem no chamador.
 */
export function FichaBia({ fs }: { fs: FactSheet }) {
  const alertas = fs.evidencias.filter((e) => e.tipo === "alerta");
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "20px 22px",
        margin: "24px 0",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
          Análise do BIA{" "}
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
            prévia · admin
          </span>
        </h2>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: corScore(fs.score), lineHeight: 1 }}>{fs.score ?? "—"}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>Score</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#374151", lineHeight: 1 }}>{fs.grau_confianca}%</div>
            <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>Confiança</div>
          </div>
        </div>
      </div>

      <p style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "#1f2937" }}>{fs.copiloto}</p>

      {alertas.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            fontSize: 13.5,
            color: "#92400e",
          }}
        >
          {alertas.map((a) => (
            <div key={a.chave}>⚠️ {a.texto}</div>
          ))}
        </div>
      )}

      <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ color: "#6b7280", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <th style={{ padding: "6px 0", fontWeight: 600 }}>Categoria</th>
            <th style={{ padding: "6px 0", fontWeight: 600 }}>Avaliação</th>
            <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>Origem do dado</th>
          </tr>
        </thead>
        <tbody>
          {fs.fichas.map((f) => (
            <tr key={f.categoria} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={{ padding: "9px 0", color: "#374151" }}>{f.categoria}</td>
              <td style={{ padding: "9px 0" }}>
                <Estrelas n={f.estrelas} />
              </td>
              <td style={{ padding: "9px 0", textAlign: "right", color: "#9ca3af", fontSize: 12 }}>{f.origem}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {fs.coorte && (
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#9ca3af" }}>
          Comparado com {fs.coorte.tamanho} anúncios do mesmo modelo {fs.coorte.rotulo}. Análise recalculada a cada
          visita.
        </p>
      )}
    </section>
  );
}
