import Link from "next/link";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria } from "@/lib/acessos";
import DefinirSenha from "@/components/DefinirSenha";
import LogoutButton from "@/components/LogoutButton";
import InstalarApp from "@/components/InstalarApp";
import BotaoCompra from "@/components/BotaoCompra";

export const dynamic = "force-dynamic";

export default async function Perfil() {
  const sb = await criarSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const [admin, acessos, cfg] = await Promise.all([
    user ? ehAdmin(sb, user.id) : false,
    user ? acessosDaUsuaria(sb, user.id) : new Set(),
    sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle(),
  ]);
  const planos = cfg.data?.valor || {};
  const kit = planos.kit || {};
  const assin = planos.assinatura || {};
  const temKit = acessos.has("kit") || acessos.has("assinatura");
  const temAssin = acessos.has("assinatura");

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

      {/* Kit */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">{kit.nome || "Kit da Temporada"} · vitalício</div>
        {temKit ? (
          <>
            <div className="c-t">✓ Ativo</div>
            <div className="c-p">Você tem o Panfleto e os bônus, para sempre.</div>
          </>
        ) : (
          <>
            <div className="c-t">Ainda não liberado</div>
            <div className="c-p">{kit.descricao || "O Panfleto + os bônus, acesso vitalício."}</div>
            {kit.cakto_url
              ? <BotaoCompra url={kit.cakto_url} className="pill">Liberar o Kit{kit.preco ? ` · ${kit.preco}` : ""} →</BotaoCompra>
              : <p className="muted" style={{ textAlign: "left" }}>Link em breve.</p>}
          </>
        )}
      </section>

      {/* Assinatura */}
      <section className="card dark" style={{ marginTop: 14 }}>
        <div className="c-k">{assin.nome || "A Corte"} · assinatura</div>
        {temAssin ? (
          <>
            <div className="c-t">✓ Assinatura ativa</div>
            <div className="c-p">Jornada semanal, o Salão e as ferramentas de discernimento.</div>
          </>
        ) : (
          <>
            <div className="c-t">{assin.descricao ? "Jornada semanal + comunidade" : "Em breve"}</div>
            <div className="c-p">{assin.descricao || "Devocional novo toda semana, o Salão das damas e as ferramentas."}</div>
            {assin.cakto_url
              ? <BotaoCompra url={assin.cakto_url} className="pill">{assin.trial_dias ? `Começar ${assin.trial_dias} dias grátis` : "Assinar"}{assin.preco ? ` · ${assin.preco}` : ""} →</BotaoCompra>
              : <span className="pill" style={{ opacity: 0.6 }}>Em breve</span>}
          </>
        )}
      </section>

      <InstalarApp />

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">A sua conta</div>
        <DefinirSenha />
        <div style={{ marginTop: 10 }}><LogoutButton /></div>
      </section>

      <hr className="divider" />
      <p className="muted">Em breve: gerenciar assinatura e notificações.</p>
    </main>
  );
}
