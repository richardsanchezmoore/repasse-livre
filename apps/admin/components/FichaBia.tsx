import type { FactSheet } from "@/lib/bia/tipos";

function Estrelas({ n }: { n: number | null }) {
  if (n == null) return null;
  return (
    <span style={{ letterSpacing: 1 }} aria-label={`${n} de 5`}>
      <span style={{ color: "#f59e0b" }}>{"★".repeat(n)}</span>
      <span style={{ color: "#e5e7eb" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

/** Renderiza **negrito** simples do texto do parecer. */
function Texto({ children }: { children: string }) {
  const partes = children.split("**");
  return (
    <>
      {partes.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

function corScore(score: number | null): string {
  if (score == null) return "#6b7280";
  if (score >= 70) return "#059669";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

/**
 * Análise do Copiloto — o parecer que o comprador lê. Instrutivo (veredito →
 * motivo → posição), sem jargão técnico nem "N/D". Consome o FactSheet da BIA
 * Engine (nada é calculado aqui). Prévia admin-only por ora; gate Premium depois.
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
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>Análise do Copiloto</h2>
        <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: corScore(fs.score), lineHeight: 1 }}>{fs.score ?? "—"}</span>
          <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>/100</span>
        </div>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "#1f2937" }}>
        <Texto>{fs.copiloto}</Texto>
      </p>

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

      {fs.destaques.length > 0 && (
        <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {fs.destaques.map((d, i) => (
            <li key={i} style={{ fontSize: 14, color: "#111827", display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✔</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}

      {fs.fichas.length > 0 && (
        <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse", fontSize: 13.5 }}>
          <tbody>
            {fs.fichas.map((f) => (
              <tr key={f.categoria} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={{ padding: "9px 0", color: "#374151" }}>{f.categoria}</td>
                <td style={{ padding: "9px 0", textAlign: "right" }}>
                  <Estrelas n={f.estrelas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {fs.coorte && (
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#9ca3af" }}>
          Comparado com {fs.coorte.tamanho} anúncios do mesmo modelo {fs.coorte.rotulo}.
        </p>
      )}
    </section>
  );
}
