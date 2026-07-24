import Link from "next/link";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { formatarMoeda } from "@/lib/formatadores";
import { gerarConteudoSocial } from "@/lib/legendasSociais";

// Preview do criativo (protegida pelo layout do grupo (painel) → só admin).
// Mostra os DOIS formatos gerados pela rota /criativos/[id]/png: feed 4:5 e
// stories 9:16 (?formato=stories), cada um com seu botão de download.
// Fluxo: escolho o carro no board, clico "Criativo", baixo os formatos.

export const dynamic = "force-dynamic";

export default async function PreviaCriativoPage({ params }: { params: { id: string } }) {
  const op = await buscarOportunidadePorId(params.id, true);
  // ?v anti-cache: cada abertura busca PNGs frescos (senão o browser reusa a imagem
  // já baixada pra essa URL e parece "trancado" no criativo antigo).
  const versao = Date.now();
  const feedUrl = `/criativos/${params.id}/png?v=${versao}`;
  const storiesUrl = `/criativos/${params.id}/png?formato=stories&v=${versao}`;
  // Legendas + hashtags + link prontos pra colar nas redes (fluxo mobile copy-paste).
  const social = op ? gerarConteudoSocial(op) : null;

  const botao = (cor: string, bg: string, borda?: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: bg,
    color: cor,
    border: borda ? `1px solid ${borda}` : "none",
    fontWeight: 700,
    fontSize: 14,
    padding: "11px 18px",
    borderRadius: 999,
    textDecoration: "none",
  });

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#0F1B2D" }}>
      <Link href="/" style={{ fontSize: 14, color: "#5A6572", textDecoration: "none" }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "10px 0 4px" }}>Criativo de anúncio</h1>
      <p style={{ fontSize: 14, color: "#606975", margin: "0 0 24px" }}>
        {op ? op.veiculo : "Oportunidade não encontrada"}
        {op?.cidade ? ` · ${op.cidade} · ${op.estado}` : ""}
      </p>

      {op ? (
        <>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {/* FEED 4:5 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: "#EEF1F4", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#5A6572" }}>Feed · 4:5 · 1080×1350</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feedUrl} alt={`Criativo feed ${op.veiculo}`} width={320} height={400} style={{ width: 320, height: 400, borderRadius: 12, boxShadow: "0 16px 40px -16px rgba(15,27,45,.4)" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <a href={feedUrl} download={`criativo-feed-${params.id}.png`} style={botao("#fff", "#16A34A")}>Baixar PNG</a>
                <a href={feedUrl} target="_blank" rel="noreferrer" style={botao("#0F1B2D", "#fff", "#D5DCE4")}>Tela cheia</a>
              </div>
            </div>

            {/* STORIES 9:16 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: "#EEF1F4", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#5A6572" }}>Stories · 9:16 · 1080×1920</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storiesUrl} alt={`Criativo stories ${op.veiculo}`} width={260} height={462} style={{ width: 260, height: 462, borderRadius: 12, boxShadow: "0 16px 40px -16px rgba(15,27,45,.4)" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <a href={storiesUrl} download={`criativo-stories-${params.id}.png`} style={botao("#fff", "#16A34A")}>Baixar PNG</a>
                <a href={storiesUrl} target="_blank" rel="noreferrer" style={botao("#0F1B2D", "#fff", "#D5DCE4")}>Tela cheia</a>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 28, fontSize: 13, color: "#8A929C", lineHeight: 1.6, textAlign: "center" }}>
            <b style={{ color: "#606975" }}>Dados:</b> ganho{" "}
            {op.fipe_valor && op.fipe_valor > op.preco ? formatarMoeda(op.fipe_valor - op.preco) : "—"} · oferta{" "}
            {formatarMoeda(op.preco)} · FIPE {formatarMoeda(op.fipe_valor)} · margem{" "}
            {op.margem_percentual != null ? `${op.margem_percentual.toFixed(1).replace(".", ",")}%` : "—"}
          </div>

          {/* PARA REDES SOCIAIS — legenda/título/link prontos pra copiar (fluxo mobile). */}
          {social ? (
            <section style={{ marginTop: 40, borderTop: "1px solid #E4E9EF", paddingTop: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Para redes sociais</h2>
              <p style={{ fontSize: 13, color: "#8A929C", margin: "0 0 20px" }}>
                Abra no celular, toque em copiar e cole no Metricool. Cada peça tem seu botão.
              </p>

              {/* Peças separadas: título · link · hashtags */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {[
                  { rot: "Título", val: social.titulo },
                  { rot: "Link (bio/post)", val: social.url },
                  { rot: "Hashtags", val: social.hashtags },
                ].map((item) => (
                  <div
                    key={item.rot}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: "#F6F8FA", border: "1px solid #E4E9EF", borderRadius: 12, padding: "12px 14px" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#8A929C", marginBottom: 3 }}>{item.rot}</div>
                      <div style={{ fontSize: 14, color: "#0F1B2D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.val}</div>
                    </div>
                    <BotaoCopiar texto={item.val} compacto />
                  </div>
                ))}
              </div>

              {/* 3 legendas (A/B/C) — copiar já traz as hashtags no fim */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {social.legendas.map((leg) => (
                  <div key={leg.rotulo} style={{ background: "#fff", border: "1px solid #E4E9EF", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#16A34A" }}>Legenda {leg.rotulo}</span>
                      <BotaoCopiar texto={`${leg.texto}\n\n${social.hashtags}`} rotulo="Copiar legenda + hashtags" compacto />
                    </div>
                    <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 14, lineHeight: 1.55, color: "#2B3542", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{leg.texto}</pre>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p style={{ fontSize: 14, color: "#B4261F" }}>Não achei essa oportunidade. Confira o ID.</p>
      )}
    </main>
  );
}
