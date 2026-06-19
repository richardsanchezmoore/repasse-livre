import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
}

/**
 * Cliente usado só em Server Components / Server Actions, com a service
 * role key — nunca importar este módulo em código que roda no navegador.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
