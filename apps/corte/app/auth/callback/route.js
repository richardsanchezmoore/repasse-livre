import { NextResponse } from "next/server";
import { criarSupabaseServer } from "@/lib/supabaseServer";

// Recebe o `code` do magic link e troca por uma sessão; volta pra onde a usuária ia.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destinoBruto = searchParams.get("redirect") || "/dossie";
  const destino = destinoBruto.startsWith("/") ? destinoBruto : "/dossie";

  if (code) {
    const supabase = await criarSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${destino}`);
}
