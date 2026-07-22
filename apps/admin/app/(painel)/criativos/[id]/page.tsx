import Link from "next/link";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { formatarMoeda } from "@/lib/formatadores";

// Preview do criativo (protegida pelo layout do grupo (painel) → só admin).
// Mostra o PNG gerado pela rota /criativos/[id]/png e um botão de download.
// Fluxo: escolho o carro no board, pego o id e abro /criativos/{id}.

export const dynamic = "force-dynamic";

export default async function PreviaCriativoPage({ params }: { params: { id: string } }) {
  const op = await buscarOportunidadePorId(params.id, true);
  // ?v anti-cache: cada abertura da prévia busca um PNG fresco (senão o browser
  // reusa a imagem já baixada pra essa URL e parece "trancado" no criativo antigo).
  const pngUrl = `/criativos/${params.id}/png?v=${Date.now()}`;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#0F1B2D" }}>
      <Link href="/" style={{ fontSize: 14, color: "#5A6572", textDecoration: "none" }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "10px 0 4px" }}>Criativo de anúncio</h1>
      <p style={{ fontSize: 14, color: "#606975", margin: "0 0 20px" }}>
        {op ? op.veiculo : "Oportunidade não encontrada"}
        {op?.cidade ? ` · ${op.cidade} · ${op.estado}` : ""}
      </p>

      {op ? (
        <>
          <div style={{ display: "flex", justifyContent: "center", background: "#EEF1F4", borderRadius: 16, padding: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pngUrl}
              alt={`Criativo ${op.veiculo}`}
              width={432}
              height={540}
              style={{ width: 432, height: 540, borderRadius: 12, boxShadow: "0 16px 40px -16px rgba(15,27,45,.4)" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <a
              href={pngUrl}
              download={`criativo-${params.id}.png`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 22px", borderRadius: 999, textDecoration: "none" }}
            >
              Baixar PNG
            </a>
            <a
              href={pngUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #D5DCE4", color: "#0F1B2D", fontWeight: 700, fontSize: 15, padding: "13px 22px", borderRadius: 999, textDecoration: "none" }}
            >
              Abrir em tela cheia
            </a>
          </div>

          <div style={{ marginTop: 24, fontSize: 13, color: "#8A929C", lineHeight: 1.6 }}>
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
