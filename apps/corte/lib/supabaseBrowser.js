import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase no navegador (anon key + cookie de sessão → respeita RLS). */
export function criarSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
