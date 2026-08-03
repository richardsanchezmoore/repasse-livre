import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client in Server Components/Actions (anon key + cookie → RLS as the logged-in user). */
export async function criarSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component (no cookie write) — the middleware refreshes the session.
          }
        },
      },
    }
  );
}
