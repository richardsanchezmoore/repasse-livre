import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client (bypasses RLS). Server-only. Shared Supabase with
 *  Repasse Livre — this app's tables are namespaced with the `ca_` prefix.
 *  `cache: no-store`: without it Next's Data Cache freezes query results and panel
 *  changes (config, flags) never reflect on the site. */
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
