import { ImageResponse } from "next/og";
import sharp from "sharp";
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

// Ícone de câmera (contorno) embutido como data-URI — Satori renderiza <img>
// com SVG data-URI de forma confiável (sem depender de fonte de emoji).
const CAMERA_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.2"/></svg>';
const CAMERA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CAMERA_SVG)}`;

// Pin de localização (verde) — mesmo esquema de data-URI do ícone de câmera.
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1FA83A" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>';
const PIN_URI = `data:image/svg+xml;utf8,${encodeURIComponent(PIN_SVG)}`;

// UF → frase com preposição correta ("no Paraná", "em Santa Catarina") — rapport
// regional: o nome do estado por extenso conecta mais que a sigla, e casa 100% com
// o público geo-segmentado ("é o MEU estado"). Cidade limitaria demais.
const ESTADOS: Record<string, string> = {
  AC: "no Acre", AL: "em Alagoas", AP: "no Amapá", AM: "no Amazonas", BA: "na Bahia",
  CE: "no Ceará", DF: "no Distrito Federal", ES: "no Espírito Santo", GO: "em Goiás",
  MA: "no Maranhão", MT: "em Mato Grosso", MS: "em Mato Grosso do Sul", MG: "em Minas Gerais",
  PA: "no Pará", PB: "na Paraíba", PR: "no Paraná", PE: "em Pernambuco", PI: "no Piauí",
  RJ: "no Rio de Janeiro", RN: "no Rio Grande do Norte", RS: "no Rio Grande do Sul",
  RO: "em Rondônia", RR: "em Roraima", SC: "em Santa Catarina", SP: "em São Paulo",
  SE: "em Sergipe", TO: "no Tocantins",
};

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

// Baixa a imagem no servidor e devolve como data-URI JPEG. Retorna null em qualquer
// falha (URL relativa, 404, bloqueio, timeout) → o chamador cai no placeholder.
// SEMPRE converte pra JPEG com sharp: o Satori (next/og) NÃO decodifica WebP/AVIF (o
// Mercado Livre serve .webp → quebrava o PNG inteiro). Resize enxuga o data-URI/acelera.
async function paraDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, cache: "force-cache", signal: ctrl.signal }).finally(() =>
      clearTimeout(t),
    );
    if (!r.ok) return null;
    const entrada = Buffer.from(await r.arrayBuffer());
    const jpeg = await sharp(entrada)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (usuario?.role !== "admin") {
    return new Response("nao_autorizado", { status: 403 });
  }

  const op = await buscarOportunidadePorId(params.id, true);
  if (!op) return new Response("nao_encontrado", { status: 404 });

  // Formato: feed 4:5 (1080x1350, padrão) ou stories 9:16 (1080x1920). No stories a
  // foto ocupa mais altura e o bloco branco ganha ar (o conteúdo centraliza no resto).
  const stories = new URL(_req.url).searchParams.get("formato") === "stories";
  const LARGURA = 1080;
  const ALTURA = stories ? 1920 : 1350;
  const FOTO_H = stories ? 1080 : 704;

  const [fontes, fotoGrande] = await Promise.all([carregarFontes(), paraDataUri(op.foto_principal)]);

  const temFipe = op.fipe_valor != null && op.fipe_valor > op.preco;
  const ganho = temFipe ? op.fipe_valor! - op.preco : null;
  const margem = op.margem_percentual ?? 0;
  // Sem arredondar (a marca é PRECISÃO/IA): o badge mostrava 8% enquanto a margem real
  // era 7,5% — contradição. Valor exato; sem casas quando é inteiro ("13", não "13,0").
  const margemFmt = Number.isInteger(margem) ? String(margem) : margem.toFixed(1).replace(".", ",");
  const margemNumFonte = margemFmt.includes(",") ? 50 : 64; // decimal é mais largo → fonte menor no círculo
  const totalFotos = 1 + (op.fotos_secundarias?.length ?? 0);
  const nome = op.veiculo;
  const localFrase = op.estado ? (ESTADOS[op.estado] ?? `em ${op.estado}`) : null;

  // ---- Peças reaproveitadas nos dois formatos ----
  const pastilha = (top: number, left: number) =>
    temFipe ? (
      <div style={{ position: "absolute", top, left, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 152, height: 152, borderRadius: 152, backgroundColor: VERDE }}>
        {/* balanceador transparente à esquerda = largura do % visível → dígitos centrados */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", color: "#fff", lineHeight: 1 }}>
          <span style={{ fontSize: 24, fontWeight: 900, marginRight: 2, color: "transparent" }}>%</span>
          <span style={{ fontSize: margemNumFonte, fontWeight: 900 }}>{margemFmt}</span>
          <span style={{ fontSize: 24, fontWeight: 900, marginTop: 6, marginLeft: 2 }}>%</span>
        </div>
        <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: "#EAFBEE", letterSpacing: 0, marginTop: 2 }}>ABAIXO FIPE</div>
      </div>
    ) : null;

  const localLinha = localFrase ? (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PIN_URI} width={22} height={22} alt="" />
      <span style={{ color: CINZA_ROTULO, fontWeight: 600, fontSize: 26, marginLeft: 7 }}>Oportunidade {localFrase}</span>
    </div>
  ) : null;

  const contadorFotos = (
    <div style={{ display: "flex", alignItems: "center", paddingLeft: 15, paddingRight: 17, paddingTop: 10, paddingBottom: 10, borderRadius: 999, backgroundColor: "rgba(6,14,10,.7)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CAMERA_URI} width={26} height={26} alt="" />
      <span style={{ color: "#fff", fontSize: 27, fontWeight: 700, marginLeft: 9 }}>{totalFotos} fotos</span>
    </div>
  );

  const blocoValores = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: 8, color: CINZA_ROTULO }}>GANHO</div>
      <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color: VERDE, lineHeight: 1, marginTop: 8 }}>{ganho != null ? formatarMoeda(ganho) : "—"}</div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", marginTop: 14, fontSize: 34 }}>
        <span style={{ color: CINZA_ROTULO, fontWeight: 500 }}>Margem de</span>
        <div style={{ display: "flex", alignItems: "flex-start", marginLeft: 12, marginRight: 12 }}>
          <span style={{ color: VERDE, fontWeight: 700, fontSize: 44 }}>{margemFmt}</span>
          <span style={{ color: VERDE, fontWeight: 700, fontSize: 22, marginTop: 5, marginLeft: 1 }}>%</span>
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
  );

  const conteudo = stories ? (
    // ===== STORIES 9:16 — texto SÓ na zona segura (fora do topo 14% e da base 35%) =====
    // Foto full-bleed (imagem pode ir às bordas; o que não pode é TEXTO). Pastilha
    // abaixo do topo 14% (>269px). Card branco ancorado na base da zona segura (topo
    // 269 → 1238), acima da base 35% onde ficam nome do perfil e botões.
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: LARGURA, height: ALTURA, backgroundColor: FUNDO_FOTO, fontFamily: "Poppins" }}>
      {fotoGrande && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoGrande} width={LARGURA} height={ALTURA} alt="" style={{ position: "absolute", top: 0, left: 0, width: LARGURA, height: ALTURA, objectFit: "cover" }} />
      )}
      {pastilha(300, 44)}
      <div style={{ position: "absolute", top: 312, right: 44, display: "flex" }}>{contadorFotos}</div>
      <div style={{ position: "absolute", top: 269, left: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: LARGURA, height: 1050, paddingLeft: 48, paddingRight: 48, paddingBottom: 20 }}>
        {/* card semi-sólido (90%), ANCORADO NA BASE (não centrado): o carro ocupa os ~65% de
            cima e "respira" (melhor ângulo/frente do veículo). Zona estendida p/ 1050 desce o
            card mais ~80px (fica logo acima da faixa de perfil/botões do Stories) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", backgroundColor: "rgba(255,255,255,0.90)", borderRadius: 28, paddingTop: 30, paddingBottom: 34, paddingLeft: 44, paddingRight: 44 }}>
          {localLinha}
          <div style={{ display: "flex", maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 34, fontWeight: 800, color: PRETO_OFERTA, marginTop: 4, marginBottom: 6 }}>{nome}</div>
          {blocoValores}
        </div>
      </div>
    </div>
  ) : (
    // ===== FEED 4:5 =====
    <div style={{ display: "flex", flexDirection: "column", width: LARGURA, height: ALTURA, backgroundColor: "#FFFFFF", fontFamily: "Poppins" }}>
      <div style={{ position: "relative", display: "flex", width: LARGURA, height: FOTO_H, overflow: "hidden", backgroundColor: FUNDO_FOTO }}>
        {fotoGrande && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoGrande} width={LARGURA} height={FOTO_H} alt="" style={{ width: LARGURA, height: FOTO_H, objectFit: "cover" }} />
        )}
        {pastilha(28, 28)}
        <div style={{ position: "absolute", left: 32, bottom: 24, maxWidth: 850, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 42, fontWeight: 700, color: "rgba(255,255,255,.62)" }}>{nome}</div>
        <div style={{ position: "absolute", right: 26, bottom: 26, display: "flex" }}>{contadorFotos}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", paddingLeft: 56, paddingRight: 56, paddingTop: 22, paddingBottom: 22 }}>
        {localLinha}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", width: "100%" }}>{blocoValores}</div>
      </div>
    </div>
  );

  return new ImageResponse(conteudo, {
    width: LARGURA,
    height: ALTURA,
    fonts: fontes,
    // Sem cache: o criativo muda quando a oportunidade/código muda; senão o
    // browser/CDN serve o PNG antigo pela mesma URL ("trancado" no já gerado).
    headers: { "cache-control": "no-store, max-age=0, must-revalidate" },
  });
}
