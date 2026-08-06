import { redirect } from "next/navigation";
import { checarModerador } from "@/lib/moderacao";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PainelModeracao from "@/components/PainelModeracao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderação da Sala · Marta" };

const fmt = (t) => new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AdminSala() {
  const { user, moderadora } = await checarModerador();
  if (!user) redirect("/entrar");
  if (!moderadora) redirect("/sala");

  const admin = supabaseAdmin();
  const { data: msgs } = await admin.from("lar_sala_mensagens")
    .select("id, roda_id, user_id, texto, midia_path, autor_apelido, anonimo, status, denuncias, criado_em")
    .gt("denuncias", 0).order("denuncias", { ascending: false }).order("criado_em", { ascending: false }).limit(200);
  const lista = msgs || [];

  const [{ data: rodas }, { data: perfis }] = await Promise.all([
    admin.from("lar_sala_rodas").select("id, nome, icone"),
    lista.length
      ? admin.from("lar_sala_perfil").select("user_id, apelido, banido").in("user_id", [...new Set(lista.map((m) => m.user_id))])
      : Promise.resolve({ data: [] }),
  ]);
  const rodaMap = Object.fromEntries((rodas || []).map((r) => [r.id, r]));
  const perfMap = Object.fromEntries((perfis || []).map((p) => [p.user_id, p]));

  const itens = lista.map((m) => ({
    id: m.id,
    roda: `${rodaMap[m.roda_id]?.icone || ""} ${rodaMap[m.roda_id]?.nome || ""}`.trim(),
    texto: m.texto || (m.midia_path ? "📷 (foto)" : "—"),
    status: m.status,
    denuncias: m.denuncias,
    quando: fmt(m.criado_em),
    userId: m.user_id,
    autor: m.anonimo ? "Anônima" : (perfMap[m.user_id]?.apelido || m.autor_apelido || "—"),
    banida: !!perfMap[m.user_id]?.banido,
  }));

  return (
    <main className="screen">
      <div className="eyebrow">🛡️ Moderação</div>
      <h1 className="h">A Sala <span style={{ color: "var(--clay)" }}>em ordem</span></h1>
      <p className="sub">Denúncias das irmãs — cuide com carinho e firmeza. 💛</p>
      <PainelModeracao itens={itens} />
    </main>
  );
}
