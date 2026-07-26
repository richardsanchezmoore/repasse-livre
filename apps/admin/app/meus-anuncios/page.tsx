import { redirect } from "next/navigation";
import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { formatarMoeda } from "@/lib/formatadores";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Status do anúncio do ponto de vista do VENDEDOR.
const ESTAGIO: Record<string, { rotulo: string; cor: string; bg: string }> = {
  aprovada: { rotulo: "No ar", cor: "#166534", bg: "#dcfce7" },
  aguardando_pagamento: { rotulo: "Aguardando pagamento", cor: "#92400e", bg: "#fef3c7" },
  pix_gerado: { rotulo: "PIX gerado · pague pra publicar", cor: "#9a3412", bg: "#ffedd5" },
  descoberta: { rotulo: "Em revisão", cor: "#3730a3", bg: "#e0e7ff" },
  rejeitada: { rotulo: "Não aprovado", cor: "#991b1b", bg: "#fee2e2" },
};

interface LinhaAnuncio {
  id: string;
  veiculo: string;
  ano: string | null;
  preco: number;
  margem_percentual: number | null;
  status: string;
  foto_principal: string | null;
  cidade: string | null;
  estado: string | null;
}

export default async function MeusAnunciosPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login?redirect=%2Fmeus-anuncios");

  const [{ data }, contagens, estadosDisponiveis] = await Promise.all([
    supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, ano, preco, margem_percentual, status, foto_principal, cidade, estado, data_captura")
      .eq("criado_por", usuario.id)
      .order("data_captura", { ascending: false })
      .limit(200),
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
  ]);

  const lista = (data ?? []) as unknown as LinhaAnuncio[];

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} usuarioLogado />
          <main className="conteudo">
            <div className="pagina-publica">
              <h1>Meus anúncios</h1>
              <p className="pagina-publica-intro">
                Seus carros anunciados no Repasse Livre e o status de cada um.
              </p>

              {lista.length === 0 ? (
                <p style={{ color: "#5a6572" }}>
                  Você ainda não tem anúncios.{" "}
                  <a href="/vender" style={{ color: "#16a34a", fontWeight: 700 }}>
                    Anuncie seu carro →
                  </a>
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {lista.map((a) => {
                    const est = ESTAGIO[a.status] ?? { rotulo: a.status, cor: "#374151", bg: "#f3f4f6" };
                    return (
                      <div
                        key={a.id}
                        style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid #E4EAE6", borderRadius: 14, padding: 12, background: "#fff" }}
                      >
                        {a.foto_principal ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.foto_principal}
                            alt={a.veiculo}
                            style={{ width: 92, height: 70, objectFit: "cover", borderRadius: 10, flex: "none", background: "#eef1f4" }}
                          />
                        ) : (
                          <div style={{ width: 92, height: 70, borderRadius: 10, background: "#eef1f4", flex: "none" }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F1B2D" }}>
                            {a.veiculo} <span style={{ color: "#9ca3af", fontWeight: 500 }}>{a.ano}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                            {formatarMoeda(a.preco)}
                            {typeof a.margem_percentual === "number" ? ` · ${a.margem_percentual.toFixed(1)}% abaixo da FIPE` : ""}
                            {a.cidade ? ` · ${a.cidade}/${a.estado ?? ""}` : ""}
                          </div>
                          <span style={{ display: "inline-block", marginTop: 7, fontSize: 11.5, fontWeight: 800, color: est.cor, background: est.bg, padding: "3px 10px", borderRadius: 999 }}>
                            {est.rotulo}
                          </span>
                        </div>
                        <a
                          href={a.status === "pix_gerado" || a.status === "aguardando_pagamento" ? "/vender" : `/oportunidade/${a.id}`}
                          style={{ flex: "none", fontSize: 13, fontWeight: 700, color: "#2563eb", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          {a.status === "pix_gerado" || a.status === "aguardando_pagamento" ? "Concluir →" : "Ver →"}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
