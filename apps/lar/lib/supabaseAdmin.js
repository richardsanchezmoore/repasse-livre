import { createClient } from "@supabase/supabase-js";

/** Cliente Supabase com service role (ignora RLS). SÓ no servidor.
 *  `cache: no-store` no fetch: sem isso o Data Cache do Next guarda o resultado
 *  das queries (ex.: raiz/config) e mudanças no painel não refletem no site. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) },
    }
  );
}
