import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components/Server Actions — usa a anon key
 * + cookie de sessão (respeita RLS como o usuário logado). Distinto do
 * `supabaseAdmin` (service role, ignora RLS) em `lib/supabase.ts`, que
 * continua sendo usado pelas operações administrativas internas.
 */
export async function criarSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaSetar) {
          try {
            cookiesParaSetar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component (sem permissão de escrever
            // cookies) — o middleware já cuida de renovar a sessão.
          }
        },
      },
    }
  );
}

export interface Usuario {
  id: string;
  email: string | null;
  nome: string | null;
  role: "admin" | "publico";
}

/** Sessão + perfil (role) do usuário atual, ou null se deslogado. */
export async function obterUsuarioAtual(): Promise<Usuario | null> {
  const supabase = await criarSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: perfil } = await supabase.from("perfis").select("role").eq("user_id", user.id).single();

  // Login com Google traz nome em user_metadata (full_name/name); login por
  // e-mail/senha não tem esse dado — usa o e-mail mesmo nesse caso.
  const nomeGoogle = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    nome: typeof nomeGoogle === "string" ? nomeGoogle : null,
    role: perfil?.role === "admin" ? "admin" : "publico",
  };
}
