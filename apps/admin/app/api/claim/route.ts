import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Troca um token de claim (gerado em /planos, amarrado à conta pelo webhook da
 * Cakto após o pagamento) por credenciais de sessão — SEM mandar email. O
 * cliente (/bem-vindo) usa essas credenciais no verifyOtp pra auto-logar, e aí
 * o comprador define a senha. Uso único e curto: consumido na 1ª troca.
 *
 * Não é a fonte da verdade do acesso (isso é `perfis`, via webhook) — é só o
 * "handoff" de sessão pra eliminar o email do fluxo pós-compra.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALIDADE_MS = 60 * 60 * 1000; // 1h: tempo de sobra entre pagar e cair no /bem-vindo

export async function POST(req: Request): Promise<Response> {
  let token = "";
  try {
    const corpo = (await req.json()) as { token?: unknown };
    token = typeof corpo.token === "string" ? corpo.token.trim() : "";
  } catch {
    /* corpo inválido */
  }
  if (!token) return NextResponse.json({ pronto: false, erro: "sem_token" }, { status: 400 });

  const { data: claim } = await supabaseAdmin
    .from("claims")
    .select("user_id, email, status, criado_em")
    .eq("token", token)
    .maybeSingle();

  // Ainda não existe = webhook processando (o comprador chegou antes) → cliente re-tenta.
  if (!claim) return NextResponse.json({ pronto: false, aguardando: true });
  if (claim.status !== "ready") return NextResponse.json({ pronto: false, consumido: true });
  if (!claim.email || Date.now() - new Date(claim.criado_em).getTime() > VALIDADE_MS) {
    return NextResponse.json({ pronto: false, expirado: true });
  }

  // Gera credenciais de sessão SEM enviar email (generateLink só gera, não dispara).
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: claim.email,
  });
  if (error || !data.properties) {
    console.error(`[api/claim] generateLink falhou p/ ${claim.email}: ${error?.message ?? "?"}`);
    return NextResponse.json({ pronto: false, erro: "sessao" }, { status: 500 });
  }

  // Consome o claim (uso único) — a partir daqui o token não vale mais.
  await supabaseAdmin.from("claims").update({ status: "consumed" }).eq("token", token);

  return NextResponse.json({
    pronto: true,
    email: claim.email,
    hashedToken: data.properties.hashed_token,
    emailOtp: data.properties.email_otp,
  });
}
