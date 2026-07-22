import { ImageResponse } from "next/og";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { buscarOportunidadePorId } from "@/components/DiscoveriesBoard";
import { formatarMoeda } from "@/lib/formatadores";

// Gerador de criativo de anúncio (PNG 1080x1350) a partir de uma oportunidade.
// Render server-side via Satori (next/og): as fotos são pré-baixadas pra data-URI
// aqui no servidor, então CORS/hotlink do CDN de origem (OLX/ML) não quebram a
// exportação — o que mataria uma abordagem client-side (canvas "tainted").
// Guarda admin por dentro: route handler NÃO roda o layout do grupo (painel),
// então a proteção do layout não se aplica — checo a sessão aqui.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERDE = "#1FA83A";
const CINZA_ROTULO = "#8A968E";
const PRETO_OFERTA = "#16221B";
const CINZA_FIPE = "#7C877F";
const LINHA = "#E9EDEA";
const FUNDO_FOTO = "#0E1A14";

async function carregarFontes() {
  const base = "https://github.com/google/fonts/raw/main/ofl/poppins";
  const pesos: { arquivo: string; weight: 500 | 600 | 700 | 900 }[] = [
    { arquivo: "Poppins-Medium.ttf", weight: 500 },
    { arquivo: "Poppins-SemiBold.ttf", weight: 600 },
    { arquivo: "Poppins-Bold.ttf", weight: 700 },
    { arquivo: "Poppins-Black.ttf", weight: 900 },
  ];
  return Promise.all(
    pesos.map(async (p) => ({
      name: "Poppins",
      data: await fetch(`${base}/${p.arquivo}`, { cache: "force-cache" }).then((r) => r.arrayBuffer()),
      weight: p.weight,
      style: "normal" as const,
    })),
  );
}

// Baixa a imagem no servidor e devolve como data-URI (base64). Retorna null em
// qualquer falha (URL relativa, 404, bloqueio) → o chamador cai no placeholder.
async function paraDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, cache: "force-cache" });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
    return `data:${tipo};base64,${b64}`;
  } catch {
    return null;
  }
}

function celulaFoto(uri: string | null, extras: React.CSSProperties = {}): React.CSSProperties {
  return {
    display: "flex",
    backgroundColor: FUNDO_FOTO,
    backgroundImage: uri ? `url(${uri})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    ...extras,
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (usuario?.role !== "admin") {
    return new Response("nao_autorizado", { status: 403 });
  }

  const op = await buscarOportunidadePorId(params.id, true);
  if (!op) return new Response("nao_encontrado", { status: 404 });

  const [fontes, fotoGrande, fotoP1, fotoP2] = await Promise.all([
    carregarFontes(),
    paraDataUri(op.foto_principal),
    paraDataUri(op.fotos_secundarias?.[0]),
    paraDataUri(op.fotos_secundarias?.[1]),
  ]);

  const temFipe = op.fipe_valor != null && op.fipe_valor > op.preco;
  const ganho = temFipe ? op.fipe_valor! - op.preco : null;
  const margem = op.margem_percentual ?? 0;
  const margemInt = Math.round(margem);
  const margemTexto = margem.toFixed(1).replace(".", ",");
  const totalFotos = 1 + (op.fotos_secundarias?.length ?? 0);
  const restantes = Math.max(0, totalFotos - 3);
  const nome = op.veiculo;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: 1080, height: 1350, backgroundColor: "#FFFFFF", fontFamily: "Poppins" }}>
        {/* ===== Mosaico de fotos ===== */}
        <div style={{ display: "flex", width: 1080, height: 704 }}>
          {/* foto grande */}
          <div style={celulaFoto(fotoGrande, { position: "relative", width: 724, height: 704 })}>
            {/* pastilha de margem */}
            {temFipe && (
              <div style={{ position: "absolute", top: 26, left: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 152, height: 152, borderRadius: 152, backgroundColor: VERDE, boxShadow: "0 8px 20px rgba(0,0,0,.28)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", color: "#fff", lineHeight: 1 }}>
                  <span style={{ fontSize: 58, fontWeight: 900 }}>{margemInt}</span>
                  <span style={{ fontSize: 26, fontWeight: 900, marginTop: 7, marginLeft: 2 }}>%</span>
                </div>
                <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: "#EAFBEE", letterSpacing: 1, marginTop: 2 }}>ABAIXO FIPE</div>
              </div>
            )}
            {/* nome do veículo (marca-d'água) — clipa no máximo da largura da foto */}
            <div style={{ position: "absolute", left: 30, bottom: 20, maxWidth: 660, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 40, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>{nome}</div>
          </div>

          {/* coluna direita: 2 fotos (50/50 exato) */}
          <div style={{ display: "flex", flexDirection: "column", width: 350, height: 704, marginLeft: 6 }}>
            <div style={celulaFoto(fotoP1, { width: 350, height: 349 })} />
            <div style={celulaFoto(fotoP2, { position: "relative", width: 350, height: 349, marginTop: 6 })}>
              {restantes > 0 && (
                <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 14, paddingRight: 14, paddingTop: 7, paddingBottom: 7, borderRadius: 999, backgroundColor: "rgba(6,14,10,.72)", color: "#fff", fontSize: 26, fontWeight: 700 }}>+{restantes}</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Bloco de informação ===== */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 56, paddingRight: 56, paddingTop: 20 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: 8, color: CINZA_ROTULO }}>GANHO</div>
          <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color: VERDE, lineHeight: 1, marginTop: 8 }}>{ganho != null ? formatarMoeda(ganho) : "—"}</div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", marginTop: 14, fontSize: 34 }}>
            <span style={{ color: CINZA_ROTULO, fontWeight: 500 }}>Margem de</span>
            <div style={{ display: "flex", alignItems: "flex-start", marginLeft: 12, marginRight: 12 }}>
              <span style={{ color: VERDE, fontWeight: 700, fontSize: 34 }}>{margemTexto}</span>
              <span style={{ color: VERDE, fontWeight: 700, fontSize: 20, marginTop: 4, marginLeft: 1 }}>%</span>
            </div>
            <span style={{ color: CINZA_ROTULO, fontWeight: 500 }}>da FIPE</span>
          </div>

          <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: LINHA, marginTop: 40 }} />

          <div style={{ display: "flex", flexDirection: "row", width: "100%", alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", paddingTop: 30, paddingBottom: 10 }}>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 5, color: CINZA_ROTULO }}>OFERTA</div>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: PRETO_OFERTA, marginTop: 8 }}>{formatarMoeda(op.preco)}</div>
            </div>
            <div style={{ display: "flex", width: 2, backgroundColor: LINHA }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", paddingTop: 30, paddingBottom: 10 }}>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 5, color: CINZA_ROTULO }}>FIPE</div>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 600, color: CINZA_FIPE, marginTop: 8 }}>{formatarMoeda(op.fipe_valor)}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: fontes },
  );
}
