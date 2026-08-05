import FilhosBoard from "@/components/FilhosBoard";
import { criarSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Família & Virtudes · Marta" };

function segundaDaSemana() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function Filhos() {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  let familiaFilhos = [];
  let salva = null;
  if (auth?.user) {
    const [{ data: fam }, { data: pl }] = await Promise.all([
      sb.from("lar_familia").select("filhos").eq("user_id", auth.user.id).maybeSingle(),
      sb.from("lar_placar").select("dados, marcados, estrelas, semana").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    familiaFilhos = fam?.filhos || [];
    if (pl?.dados && Object.keys(pl.dados).length) {
      const novaSemana = pl.semana !== segundaDaSemana(); // vira a semana → placar zera
      salva = {
        dados: pl.dados,
        marcados: novaSemana ? {} : (pl.marcados || {}),
        estrelas: novaSemana ? 0 : (pl.estrelas || 0),
      };
    }
  }
  return (
    <main className="screen">
      <div className="eyebrow">🧒 Família & Virtudes</div>
      <h1 className="h">Formar o <span style={{ color: "var(--clay)" }}>caráter</span>, com leveza</h1>
      <FilhosBoard logado={!!auth?.user} filhosIniciais={familiaFilhos} salva={salva} />
    </main>
  );
}
