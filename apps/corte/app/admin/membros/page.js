import { exigirAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ConstrutorMembros from "@/components/ConstrutorMembros";

export const dynamic = "force-dynamic";

export default async function AdminMembrosPage() {
  await exigirAdmin();
  const admin = supabaseAdmin();
  const { data: auth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = auth?.users || [];
  const [{ data: membros }, { data: acessos }, { data: dossies }] = await Promise.all([
    admin.from("corte_membros").select("user_id, nome, is_admin"),
    admin.from("corte_acessos").select("user_id, tipo, status"),
    admin.from("corte_dossies").select("user_id"),
  ]);
  const mMap = new Map((membros || []).map((m) => [m.user_id, m]));
  const aMap = {};
  for (const a of acessos || []) (aMap[a.user_id] ||= []).push(a);
  const dCount = {};
  for (const d of dossies || []) dCount[d.user_id] = (dCount[d.user_id] || 0) + 1;

  const lista = users.map((u) => ({
    user_id: u.id,
    email: u.email || "—",
    nome: mMap.get(u.id)?.nome || u.user_metadata?.nome || null,
    is_admin: !!mMap.get(u.id)?.is_admin,
    kit: (aMap[u.id] || []).some((a) => a.tipo === "kit" && a.status === "ativo"),
    assinatura: (aMap[u.id] || []).some((a) => a.tipo === "assinatura" && a.status === "ativo"),
    dossies: dCount[u.id] || 0,
    criado: u.created_at,
  })).sort((a, b) => new Date(b.criado) - new Date(a.criado));

  return (
    <main className="screen">
      <div className="eyebrow">◈ Membros ◈</div>
      <h1 className="h-title">As <em>damas</em> da Corte</h1>
      <p className="h-sub">{lista.length} conta(s). Conceda acessos, promova admin, acompanhe quem entrou.</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorMembros membros={lista} />
      </div>
    </main>
  );
}
