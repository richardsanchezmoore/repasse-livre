import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Troca um token de claim (gerado pelo BotaoCompra, amarrado à conta pelo webhook
 * da Cakto após o pagamento) por credenciais de sessão — SEM enviar e-mail. A
 * /bem-vinda usa essas credenciais no verifyOtp pra auto-logar, e aí a compradora
 * só define a senha. Uso único e curto: consumido na 1ª troca.
 *
 * Não é a fonte da verdade do acesso (isso é corte_acessos, via webhook) — é só o
 * "handoff" de sessão pra tirar o e-mail do fluxo pós-compra.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALIDADE_MS = 60 * 60 * 1000; // 1h de sobra entre pagar e cair na /bem-vinda

export async function POST(req) {
  let token = "";
  try {
    const corpo = await req.json();
    token = typeof corpo?.token === "string" ? corpo.token.trim() : "";
  } catch { /* corpo inválido */ }
  if (!token) return NextResponse.json({ pronto: false, erro: "sem_token" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: claim } = await admin
    .from("corte_claims")
    .select("user_id, email, status, criado_em")
    .eq("token", token)
    .maybeSingle();

  // Ainda não existe = webhook processando (a compradora chegou antes) → re-tenta.
  if (!claim) return NextResponse.json({ pronto: false, aguardando: true });
  if (claim.status !== "ready") return NextResponse.json({ pronto: false, consumido: true });
  if (!claim.email || Date.now() - new Date(claim.criado_em).getTime() > VALIDADE_MS) {
    return NextResponse.json({ pronto: false, expirado: true });
  }

  // Gera credenciais de sessão SEM enviar e-mail (generateLink só gera, não dispara).
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: claim.email });
  if (error || !data?.properties) {
    console.error(`[corte/claim] generateLink falhou p/ ${claim.email}: ${error?.message ?? "?"}`);
    return NextResponse.json({ pronto: false, erro: "sessao" }, { status: 500 });
  }

  await admin.from("corte_claims").update({ status: "consumed" }).eq("token", token);

  return NextResponse.json({
    pronto: true,
    email: claim.email,
    hashedToken: data.properties.hashed_token,
    emailOtp: data.properties.email_otp,
  });
}
