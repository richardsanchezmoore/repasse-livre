import CasaPlanner from "@/components/CasaPlanner";
import { contexto } from "@/lib/membro";
import { criarSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ordem da Casa · Marta" };

export default async function Casa() {
  const { user, familia } = await contexto();
  let salva = null;
  if (user) {
    const sb = await criarSupabaseServer();
    const { data } = await sb.from("lar_rotina").select("dados").eq("user_id", user.id).maybeSingle();
    salva = data?.dados && Object.keys(data.dados).length ? data.dados : null;
  }
  return (
    <main className="screen">
      <div className="eyebrow">🧹 Ordem da Casa</div>
      <h1 className="h">Uma casa em ordem, <span style={{ color: "var(--clay)" }}>sem se matar</span></h1>
      <CasaPlanner logado={!!user} salva={salva} familia={familia} />
    </main>
  );
}
