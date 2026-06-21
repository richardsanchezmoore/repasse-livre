import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components — usa a anon key (respeita RLS
 * como o usuário logado, via cookie de sessão). Usado para login/logout e
 * para o fluxo de favoritar a partir do navegador.
 */
export function criarSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
