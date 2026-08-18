import QRCode from "qrcode";
import { criarPix } from "@/lib/caktoApi";
import { offerIdAtivo } from "@/lib/caktoOferta";
import { salvarTracking } from "@/lib/tracking";

// POST /api/pix — cria a cobrança PIX e devolve o copia-e-cola + a imagem do QR.
// Body: { nome, email, cpf, whatsapp, fingerprint?, metadata? }
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function soDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

export async function POST(req) {
  const b = await req.json().catch(() => ({}));

  const nome = String(b.nome || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const cpf = soDigitos(b.cpf);
  let tel = soDigitos(b.whatsapp);
  if (tel && !tel.startsWith("55")) tel = "55" + tel;

  if (nome.length < 2 || !email.includes("@") || cpf.length !== 11 || tel.length < 12) {
    return Response.json({ ok: false, erro: "Preencha nome, e-mail, CPF e WhatsApp." }, { status: 400 });
  }

  const r = await criarPix({
    nome,
    email,
    cpf,
    telefone: tel,
    fingerprint: b.fingerprint,
    offerId: await offerIdAtivo(),
    metadata: b.metadata,
  });

  if (!r.ok) {
    // Loga o erro real da Cakto no server, devolve mensagem genérica pro cliente.
    console.error("[pix] falha criar cobranca", r.status, JSON.stringify(r.erro));
    return Response.json({ ok: false, erro: "Não foi possível gerar o PIX agora. Tente novamente." }, { status: 502 });
  }

  // Guarda os sinais de atribuição ligados ao pedido — o webhook enriquece o CAPI depois.
  const t = b.tracking || {};
  await salvarTracking(r.id, { email, valor: r.amount, fbp: t.fbp, fbc: t.fbc, fbclid: t.fbclid, utm_source: t.utm_source, utm_medium: t.utm_medium, utm_campaign: t.utm_campaign, utm_content: t.utm_content, utm_term: t.utm_term });

  // A API só devolve o copia-e-cola; a imagem do QR a gente gera aqui.
  let qrImg = "";
  try {
    if (r.qrCode) {
      qrImg = await QRCode.toDataURL(r.qrCode, { margin: 1, width: 340, errorCorrectionLevel: "M" });
    }
  } catch (e) {
    console.error("[pix] falha gerar QR image", e?.message);
  }

  return Response.json({
    ok: true,
    id: r.id,
    qrCode: r.qrCode,
    qrImg,
    amount: r.amount,
    expiraEm: r.expiraEm,
  });
}
