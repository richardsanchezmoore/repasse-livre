import { redirect } from "next/navigation";
import { contarOportunidades } from "@/components/DiscoveriesBoard";
import { ListaUsuarios, type UsuarioComRole } from "@/components/ListaUsuarios";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function UsuariosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual?.role !== "admin") {
    redirect("/");
  }

  const [{ data: perfis, error: erroPerfis }, { data: listaAuth, error: erroAuth }] = await Promise.all([
    supabaseAdmin.from("perfis").select("user_id, role"),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  if (erroPerfis) {
    throw new Error(`Falha ao buscar perfis: ${erroPerfis.message}`);
  }
  if (erroAuth) {
    throw new Error(`Falha ao buscar usuários: ${erroAuth.message}`);
  }

  const emailPorId = new Map(listaAuth.users.map((u) => [u.id, u.email ?? null]));

  const usuarios: UsuarioComRole[] = (perfis ?? [])
    .map((perfil) => ({
      userId: perfil.user_id as string,
      email: emailPorId.get(perfil.user_id as string) ?? null,
      role: (perfil.role as "admin" | "publico") ?? "publico",
    }))
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

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
