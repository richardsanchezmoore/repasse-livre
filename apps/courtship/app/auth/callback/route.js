import { NextResponse } from "next/server";
import { criarSupabaseServer } from "@/lib/supabaseServer";

// Receives the magic-link `code` and exchanges it for a session; returns where the user was going.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destinoBruto = searchParams.get("redirect") || "/";
  const destino = destinoBruto.startsWith("/") ? destinoBruto : "/";

  if (code) {
    const supabase = await criarSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${destino}`);
}
