import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client (bypasses RLS). Server-only. Shared Supabase with
 *  Repasse Livre — this app's tables are namespaced with the `ca_` prefix. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
