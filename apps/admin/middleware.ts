import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cookie de sessão do Supabase: `sb-<ref>-auth-token` (pode vir fatiado em
 * `.0`/`.1` quando é grande). Sem NENHUM deles, não existe sessão pra renovar.
 */
function temCookieDeSessao(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));
}

// Renova o cookie de sessão a cada request — padrão oficial do @supabase/ssr
// para Next.js App Router (sem isso, o cookie expira e o usuário é
// deslogado mesmo navegando ativamente).
export async function middleware(request: NextRequest) {
  // ★ VISITANTE ANÔNIMO SAI CEDO. Sem cookie de sessão não há o que renovar, e o
  // `getUser()` abaixo é uma CHAMADA DE REDE ao Supabase Auth — paga em toda
  // requisição. O tráfego público é dominado por robô (sitemap com ~10 mil URLs,
  // ~9,5 mil delas páginas de produto), então isso era uma ida ao Supabase por
  // rastreio, pra renovar sessão inexistente.
  // NÃO confundir com o custo de CPU da Vercel: isto aqui é Edge; a Active CPU que
  // estourou o Hobby vem do SSR das páginas (force-dynamic). Ver o plano de ISR.
  if (!temCookieDeSessao(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaSetar) {
          cookiesParaSetar.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesParaSetar.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
