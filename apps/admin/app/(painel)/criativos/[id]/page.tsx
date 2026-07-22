import Link from "next/link";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { formatarMoeda } from "@/lib/formatadores";

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
        </>
      ) : (
        <p style={{ fontSize: 14, color: "#B4261F" }}>Não achei essa oportunidade. Confira o ID.</p>
      )}
    </main>
  );
}
