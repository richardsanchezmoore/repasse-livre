import { NextResponse, type NextRequest } from "next/server";
import { caminhoRedirectSeguro } from "@/lib/redirectSeguro";
import { criarSupabaseServer } from "@/lib/supabase-server";

// Recebe o `code` do magic link / Google OAuth e troca por uma sessão.
// `redirect` volta o usuário pra onde ele queria ir antes do login (ex.:
// /enviar, que agora exige conta — ver app/enviar/page.tsx).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destino = caminhoRedirectSeguro(searchParams.get("redirect"));

  if (code) {
    const supabase = await criarSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
