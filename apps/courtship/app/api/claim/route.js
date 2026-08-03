import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Exchanges a claim token (set by the landing, tied to the account by the Lemon
 * Squeezy webhook after payment) for session credentials — WITHOUT sending email.
 * /welcome uses these in verifyOtp to auto-log-in, then the buyer just sets a
 * password. Single-use and short-lived: consumed on first exchange.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALIDADE_MS = 60 * 60 * 1000; // 1h buffer between paying and landing on /welcome

export async function POST(req) {
  let token = "";
  try {
    const corpo = await req.json();
    token = typeof corpo?.token === "string" ? corpo.token.trim() : "";
  } catch { /* invalid body */ }
  if (!token) return NextResponse.json({ pronto: false, erro: "sem_token" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("ca_claims")
    .select("user_id, email, status, criado_em")
    .eq("token", token)
    .maybeSingle();

  // Not there yet = webhook still processing (buyer arrived first) → retry.
  if (!claim) return NextResponse.json({ pronto: false, aguardando: true });
  if (claim.status !== "ready") return NextResponse.json({ pronto: false, consumido: true });
  if (!claim.email || Date.now() - new Date(claim.criado_em).getTime() > VALIDADE_MS) {
    return NextResponse.json({ pronto: false, expirado: true });
  }

  // Generates session credentials WITHOUT sending an email (generateLink only builds it).
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: claim.email });
  if (error || !data?.properties) {
    console.error(`[ca/claim] generateLink failed for ${claim.email}: ${error?.message ?? "?"}`);
    return NextResponse.json({ pronto: false, erro: "sessao" }, { status: 500 });
  }

  await admin.from("ca_claims").update({ status: "consumed" }).eq("token", token);

  return NextResponse.json({
    pronto: true,
    email: claim.email,
    hashedToken: data.properties.hashed_token,
    emailOtp: data.properties.email_otp,
  });
}
