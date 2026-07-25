import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { formatarMoeda } from "@/lib/formatadores";
import { formatarWhatsapp } from "@/lib/mascaras";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Estágios do funil de pagamento do /vender (produto Low Ticket).
const ESTAGIO: Record<string, { rotulo: string; cor: string; bg: string }> = {
  aguardando_pagamento: { rotulo: "Enviou · não pagou", cor: "#92400e", bg: "#fef3c7" },
  pix_gerado: { rotulo: "Gerou PIX · não pagou", cor: "#9a3412", bg: "#ffedd5" },
  aprovada: { rotulo: "Pagou · publicado", cor: "#166534", bg: "#dcfce7" },
};

interface LinhaAnuncio {
  id: string;
  veiculo: string;
  ano: string | null;
  preco: number;
  margem_percentual: number | null;
  cidade: string | null;
  estado: string | null;
  nome_remetente: string | null;
  whatsapp: string | null;
  status: string;
  data_captura: string | null;
}

/**
 * Fila dos leads do /vender (produto "Anunciar", low ticket): mostra cada anúncio
 * e o ESTÁGIO no funil de pagamento (enviou → gerou PIX → pagou), com o contato
 * pra follow-up mesmo sem pagamento. Ver project_repasse_livre_low_ticket_vender_anuncio.
 */
export default async function AnunciosPagosPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null; // guarda real no app/(painel)/layout.tsx

  const [{ data }, contagens] = await Promise.all([
    supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, ano, preco, margem_percentual, cidade, estado, nome_remetente, whatsapp, status, data_captura")
      .eq("origem_tipo", "anuncio_pago")
      .order("data_captura", { ascending: false })
      .limit(300),
    contarOportunidades(usuario),
  ]);

  const lista = (data ?? []) as unknown as LinhaAnuncio[];
  const cont = (s: string) => lista.filter((a) => a.status === s).length;

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} />
        <main style={{ padding: "24px clamp(16px,4vw,40px)", maxWidth: 1080, width: "100%" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Anúncios pagos (/vender)</h1>
          <p style={{ color: "#6b7280", margin: "0 0 22px", fontSize: 14 }}>
            Leads do produto Low Ticket e o estágio de cada um no funil de pagamento.
          </p>

          {/* Funil */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { s: "aguardando_pagamento", n: "Enviou" },
              { s: "pix_gerado", n: "Gerou PIX" },
              { s: "aprovada", n: "Pagou · publicou" },
            ].map(({ s, n }) => (
              <div key={s} style={{ flex: "1 1 150px", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{cont(s)}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{n}</div>
              </div>
            ))}
          </div>

          {/* Lista */}
          {lista.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>Nenhum anúncio ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lista.map((a) => {
                const est = ESTAGIO[a.status] ?? { rotulo: a.status, cor: "#374151", bg: "#f3f4f6" };
                const wpp = (a.whatsapp ?? "").replace(/\D/g, "");
                return (
                  <div
                    key={a.id}
                    style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div style={{ minWidth: 210 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {a.veiculo} <span style={{ color: "#9ca3af", fontWeight: 500 }}>{a.ano}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {formatarMoeda(a.preco)} · {typeof a.margem_percentual === "number" ? `${a.margem_percentual.toFixed(1)}% abaixo` : "—"} · {a.cidade ?? "—"}/{a.estado ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      {a.nome_remetente ?? "—"}
                      {wpp && (
                        <>
                          {" · "}
                          <a href={`https://wa.me/55${wpp}`} target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontWeight: 700, textDecoration: "none" }}>
                            {formatarWhatsapp(wpp)}
                          </a>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: est.cor, background: est.bg, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                        {est.rotulo}
                      </span>
                      <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {a.data_captura ? FMT_DATA.format(new Date(a.data_captura)) : ""}
                      </span>
                      <a
                        href={`/oportunidade/${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb", textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        Ver →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </NavegacaoProvider>
  );
}
