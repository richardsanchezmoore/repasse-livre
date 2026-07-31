import Link from "next/link";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { ehAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Perfil() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const admin = user ? await ehAdmin(sb, user.id) : false;

  return (
    <main className="screen">
      <div className="eyebrow">◈ A Dama ◈</div>
      <h1 className="h-title">O seu <em>perfil</em></h1>
      {user?.email && <p className="h-sub">{user.email}</p>}

      {admin && (
        <Link href="/admin/dossie" className="card hero" style={{ marginTop: 16, display: "block" }}>
          <div className="c-k">Acesso de administração</div>
          <div className="c-t">✦ Abrir o <em>Painel</em></div>
          <div className="c-p">Construir o Dossiê, publicar materiais e gerir a Corte.</div>
          <span className="pill">Entrar no painel →</span>
        </Link>
      )}

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">Seu acesso</div>
        <div className="c-t">Kit da Temporada <em>· vitalício</em></div>
        <div className="c-p">Você tem acesso ao Panfleto e aos 5 bônus, para sempre.</div>
      </section>

      <section className="card dark" style={{ marginTop: 14 }}>
        <div className="c-k">A Corte · assinatura</div>
        <div className="c-t">Jornada semanal + comunidade</div>
        <div className="c-p">Devocional novo toda semana, o Salão das damas e as ferramentas de discernimento.</div>
        <span className="pill">Começar 7 dias grátis</span>
      </section>

      <hr className="divider" />
      <p className="muted">Em breve: gerenciar assinatura e notificações.</p>
    </main>
  );
}
