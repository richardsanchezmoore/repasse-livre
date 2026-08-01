import Link from "next/link";
import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria, temAcesso } from "@/lib/acessos";

export const dynamic = "force-dynamic";
export const metadata = { title: "A Biblioteca · A Corte" };

export default async function Biblioteca() {
  const user = await usuariaAtual();
  if (!user) redirect("/entrar?redirect=/biblioteca");

  const sb = await criarSupabaseServer();
  const [{ data: obras }, acessos, admin] = await Promise.all([
    sb.from("corte_materiais").select("chave, titulo, subtitulo, icone, acesso").eq("ativo", true).order("ordem"),
    acessosDaUsuaria(sb, user.id),
    ehAdmin(sb, user.id),
  ]);

  return (
    <main className="screen">
      <div className="eyebrow">◈ A Biblioteca ◈</div>
      <h1 className="h-title">O seu <em>acervo</em></h1>
      <p className="h-sub">O diário e os tesouros da temporada, sempre à mão.</p>

      <div className="shelf" style={{ marginTop: 18 }}>
        {(obras || []).map((o) => {
          const aberto = admin || temAcesso(acessos, o.acesso);
          return (
            <Link key={o.chave} href={`/biblioteca/${o.chave}`} className={"row" + (aberto ? "" : " trancada")}>
              <span className="ri">{o.icone || "📖"}</span>
              <div style={{ minWidth: 0 }}>
                <div className="rt">{o.titulo}</div>
                <div className="rd">{o.subtitulo}</div>
              </div>
              <span className="rgo">{aberto ? "→" : "🔒"}</span>
            </Link>
          );
        })}
      </div>

      <hr className="divider" />
      <p className="muted">Leitura leve e devocional — feita para o seu celular.</p>
    </main>
  );
}
