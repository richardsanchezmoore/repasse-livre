import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";
import { enviarEmailAcesso } from "@/lib/emailAcesso";

// Lemon Squeezy webhook. LS signs the raw body with HMAC-SHA256 (hex) in the
// `X-Signature` header, using the webhook's signing secret (LEMON_WEBHOOK_SECRET).
// Custom data we set on the checkout (?checkout[custom][claim]=TOKEN) comes back
// under meta.custom_data.claim — that's the auto-login bridge, same idea as Cakto's sck.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pick(obj, paths) {
  for (const p of paths) {
    const v = p.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    if (v != null && v !== "") return v;
  }
  return null;
}

/** Verifica a assinatura HMAC do LS contra o corpo cru. */
function assinaturaValida(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function acharOuCriarUsuario(admin, email, nome) {
  email = String(email).trim().toLowerCase();
  let pagina = 1, achado = null;
  while (pagina <= 10 && !achado) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    achado = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  if (achado) return achado;
  const { data: novo, error } = await admin.auth.admin.createUser({
    email, email_confirm: true, password: crypto.randomUUID() + "Aa1!", user_metadata: { nome: nome || null },
  });
  if (error) throw new Error(error.message);
  // setup_pendente: the buyer sets her password on /welcome (no magic link) within the window.
  await admin.from("ca_membros").upsert(
    { user_id: novo.user.id, nome: nome || null, setup_pendente: true, setup_expira_em: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { onConflict: "user_id" }
  );
  return novo.user;
}

export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const secret = (process.env.LEMON_WEBHOOK_SECRET || "").trim();
  if (!assinaturaValida(raw, signature, secret)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  let body = {};
  try { body = JSON.parse(raw); } catch { body = {}; }

  const evento = String(body?.meta?.event_name || "").toLowerCase();
  const attrs = body?.data?.attributes || {};
  const email = pick(attrs, ["user_email", "customer_email", "email"]);
  const nome = pick(attrs, ["user_name", "customer_name", "name"]);
  const status = String(attrs?.status || "").toLowerCase();
  const refunded = attrs?.refunded === true;
  const referencia = String(pick(attrs, ["order_id", "identifier"]) || pick(body, ["data.id"]) || "");
  const claimToken = String(pick(body, ["meta.custom_data.claim"]) || "").trim() || null;
  // valor em centavos → dólares
  const totalCents = Number(pick(attrs, ["total", "subtotal"]) || 0);
  const valor = totalCents > 0 ? totalCents / 100 : 9;

  if (!email) {
    console.log("[ls] sem email:", raw.slice(0, 300));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  // Só temos o KIT (one-time) por ora. Concede na compra paga; revoga no reembolso.
  const tipo = "kit";
  const cancela = evento === "order_refunded" || evento === "subscription_expired" || refunded;
  const concede = (evento === "order_created" && (status === "paid" || status === "")) ||
    evento === "subscription_payment_success";

  const admin = supabaseAdmin();
  const user = await acharOuCriarUsuario(admin, email, nome);

  if (cancela) {
    await revogarAcesso(admin, user.id, tipo);
    console.log(`[ls] REVOKED ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "revogado", tipo });
  }
  if (concede) {
    await concederAcesso(admin, user.id, tipo, { origem: "lemonsqueezy", referencia, expira_em: null });

    // TODO(US): Purchase via Meta CAPI com o pixel/dataset PRÓPRIO do mercado US (valor USD).

    if (claimToken) {
      await admin.from("ca_claims").upsert(
        { token: claimToken, user_id: user.id, email, status: "ready", criado_em: new Date().toISOString() },
        { onConflict: "token" }
      );
    }
    // Access email — fallback para quem pagou e não voltou pro /welcome. SÓ pra quem NUNCA
    // logou. AWAIT (serverless mata fire-and-forget). Reabre a janela de senha por 3 dias.
    if (!user.last_sign_in_at) {
      await admin.from("ca_membros")
        .update({ setup_pendente: true, setup_expira_em: new Date(Date.now() + 72 * 3600 * 1000).toISOString() })
        .eq("user_id", user.id);
      try {
        const r = await enviarEmailAcesso({ email, nome, tipo });
        if (!r.ok) console.error("[ls] email acesso:", r.erro);
        else console.log("[ls] email acesso enviado ·", email);
      } catch (e) { console.error("[ls] email acesso:", e?.message); }
    }
    console.log(`[ls] GRANTED ${tipo} · ${email} · ${evento}${claimToken ? " [claim]" : ""}`);
    return NextResponse.json({ ok: true, acao: "concedido", tipo });
  }
  console.log(`[ls] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "lemonsqueezy-webhook" });
}
