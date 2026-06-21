import { NextResponse, type NextRequest } from "next/server";
import { criarSupabaseServer } from "@/lib/supabase-server";

// Recebe o `code` do magic link / Google OAuth e troca por uma sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await criarSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
