import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Preço público (fonte da verdade = painel admin → corte_config.planos).
 *  A landing estática /panfleto consome isto e injeta o valor — sem hardcode. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let kit = "R$ 29,90", assinatura = "R$ 19,90/mês";
  try {
    const admin = supabaseAdmin();
    const { data } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const p = data?.valor || {};
    if (p.kit?.preco) kit = p.kit.preco;
    if (p.assinatura?.preco) assinatura = p.assinatura.preco;
  } catch { /* mantém os defaults */ }
  return NextResponse.json(
    { kit, assinatura },
    { headers: { "cache-control": "public, max-age=30, s-maxage=60" } }
  );
}
