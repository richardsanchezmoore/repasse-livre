import { exigirAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAIXA = { green: "🟢 Cavalheiro", amber: "🟡 Alerta", red: "🔴 Fuja" };

export default async function AdminLeadsPage() {
  await exigirAdmin();
  const admin = supabaseAdmin();
  const { data } = await admin.from("corte_leads").select("*").order("criado_em", { ascending: false }).limit(2000);
  const lista = data || [];
  const porFaixa = { green: 0, amber: 0, red: 0 };
  for (const l of lista) if (porFaixa[l.quiz_faixa] != null) porFaixa[l.quiz_faixa]++;

  return (
    <main className="screen">
      <div className="eyebrow">◈ Leads ◈</div>
      <h1 className="h-title">Leads do <em>quiz</em></h1>
      <p className="h-sub">
        {lista.length} lead(s) captado(s) no <code>/investigar</code>. 🟢 {porFaixa.green} · 🟡 {porFaixa.amber} · 🔴 {porFaixa.red}
      </p>

      <div className="shelf" style={{ marginTop: 16 }}>
        {lista.map((l) => {
          const digits = (l.whatsapp || "").replace(/\D/g, "");
          const wa = digits ? (digits.startsWith("55") ? digits : "55" + digits) : "";
          return (
            <div key={l.email} className="memb">
              <div className="memb-top">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="memb-nome">
                    {FAIXA[l.quiz_faixa] || "— sem veredito"}
                    {l.quiz_total != null && <span className="tag" style={{ marginLeft: 6 }}>{l.quiz_total} pts</span>}
                    {l.virou_membro && <span className="tag" style={{ marginLeft: 6, background: "#2f6b48", color: "#fff" }}>MEMBRO</span>}
                  </div>
                  <div className="memb-email">{l.email}</div>
                </div>
                <div className="memb-dos" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                </div>
              </div>
              {wa && (
                <div className="memb-chips">
                  <a className="chip" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="Abrir conversa no WhatsApp">💬 {l.whatsapp}</a>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && (
          <p className="muted" style={{ textAlign: "left" }}>Nenhum lead ainda — rode um anúncio apontando pro <code>/investigar</code>. 👀</p>
        )}
      </div>
    </main>
  );
}
