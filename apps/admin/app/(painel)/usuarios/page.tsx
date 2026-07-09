import type { User } from "@supabase/supabase-js";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { ListaUsuarios, type UsuarioComRole } from "@/components/ListaUsuarios";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Provedor com que a conta foi criada (google/email/facebook/…). */
function origemLabel(u: User | undefined): string {
  const provider = u?.app_metadata?.provider ?? u?.identities?.[0]?.provider ?? "email";
  if (provider === "google") return "Google";
  if (provider === "email") return "E-mail";
  if (provider === "facebook") return "Facebook";
  return provider;
}

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
/** Formata no server (evita mismatch de hidratação) em horário de Brasília. */
function formatarDataHora(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FMT_DATA.format(d);
}

export default async function UsuariosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) return null; // guarda real já em app/(painel)/layout.tsx — isto só estreita o tipo p/ TS

  const [{ data: perfis, error: erroPerfis }, { data: listaAuth, error: erroAuth }] = await Promise.all([
    supabaseAdmin.from("perfis").select("user_id, role, premium"),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  if (erroPerfis) {
    throw new Error(`Falha ao buscar perfis: ${erroPerfis.message}`);
  }
  if (erroAuth) {
    throw new Error(`Falha ao buscar usuários: ${erroAuth.message}`);
  }

  const authPorId = new Map(listaAuth.users.map((u) => [u.id, u]));

  const usuarios: UsuarioComRole[] = (perfis ?? [])
    .map((perfil) => {
      const auth = authPorId.get(perfil.user_id as string);
      return {
        userId: perfil.user_id as string,
        email: auth?.email ?? null,
        role: (perfil.role as "admin" | "publico") ?? "publico",
        premium: (perfil.premium as boolean) ?? false,
        origem: origemLabel(auth),
        // Ordena por cadastro desc, mas guarda o cru pra ordenar antes de formatar.
        criadoEmIso: auth?.created_at ?? null,
        cadastro: formatarDataHora(auth?.created_at ?? null),
        ultimoAcesso: formatarDataHora(auth?.last_sign_in_at ?? null),
      };
    })
    // Mais recentes primeiro — pra flagrar cadastro novo de cara.
    .sort((a, b) => (b.criadoEmIso ?? "").localeCompare(a.criadoEmIso ?? ""));

  const contagens = await contarOportunidades(usuarioAtual);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuarioAtual.role} />
        <main className="usuarios-pagina">
          <h1 className="usuarios-titulo">Usuários</h1>
          <p className="usuarios-subtitulo">Gerencie quem tem acesso administrativo ao painel.</p>
          <ListaUsuarios usuarios={usuarios} usuarioAtualId={usuarioAtual.id} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
