import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

/**
 * Abre o Customer Portal do Stripe pro assinante gerenciar (trocar cartão,
 * cancelar, ver faturas). Exige usuário logado com stripe_customer_id.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "nao_logado" }, { status: 401 });

  const { data: perfil } = await supabaseAdmin
    .from("perfis")
    .select("stripe_customer_id")
    .eq("user_id", usuario.id)
    .single();
  if (!perfil?.stripe_customer_id) {
    return NextResponse.json({ erro: "sem_assinatura" }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const sessao = await getStripe().billingPortal.sessions.create({
      customer: perfil.stripe_customer_id as string,
      return_url: `${site}/planos`,
    });
    return NextResponse.json({ url: sessao.url });
  } catch (erro) {
    console.error("[assinatura/portal] falha:", erro);
    return NextResponse.json({ erro: "falha_portal" }, { status: 500 });
  }
}
