import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente com fetch no-store: o Next.js cacheia fetch() por padrão e isso
// congelava a resposta do Supabase em produção (preço travado no default).
function adminSemCache() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (u, o = {}) => fetch(u, { ...o, cache: "no-store" }) },
  });
}

/** Preço público (fonte da verdade = painel admin → corte_config.planos).
 *  A landing estática /panfleto consome isto e injeta o valor — sem hardcode. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let kit = "R$ 29,90", assinatura = "R$ 19,90/mês";
  // Botão de WhatsApp na landing: só aparece quando ATIVADO no admin (ninguém pra
  // responder → melhor sem botão). Default: desativado.
  let whatsapp = { ativo: false, numero: "" };
  try {
    const admin = adminSemCache();
    const { data } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const p = data?.valor || {};
    if (p.kit?.preco) kit = p.kit.preco;
    if (p.assinatura?.preco) assinatura = p.assinatura.preco;
    if (p.whatsapp) whatsapp = { ativo: !!p.whatsapp.ativo, numero: String(p.whatsapp.numero || "").replace(/\D/g, "") };
  } catch { /* mantém os defaults */ }
  return NextResponse.json(
    { kit, assinatura, whatsapp },
    { headers: { "cache-control": "public, max-age=60, s-maxage=60" } }
  );
}
