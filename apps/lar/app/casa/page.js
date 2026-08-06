import CasaPlanner from "@/components/CasaPlanner";
import CasaTabs from "@/components/CasaTabs";
import { contexto } from "@/lib/membro";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { carregarFaxina } from "@/lib/faxina";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ordem da Casa · Marta" };

export default async function Casa() {
  const { user, familia } = await contexto();
  let salva = null, faxina = null;
  if (user) {
    const sb = await criarSupabaseServer();
    const { data } = await sb.from("lar_rotina").select("dados").eq("user_id", user.id).maybeSingle();
    salva = data?.dados && Object.keys(data.dados).length ? data.dados : null;
    faxina = await carregarFaxina(user.id);
  }
  return (
    <main className="screen">
      <div className="eyebrow">🧹 Ordem da Casa</div>
      <h1 className="h">Uma casa em ordem, <span style={{ color: "var(--clay)" }}>sem se matar</span></h1>
      {user
        ? <CasaTabs faxina={faxina} salva={salva} familia={familia} logado />
        : <CasaPlanner logado={false} salva={salva} familia={familia} />}
    </main>
  );
}
