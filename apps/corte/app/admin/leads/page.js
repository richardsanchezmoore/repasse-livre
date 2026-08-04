import { exigirAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CopiarWhatsapps from "@/components/CopiarWhatsapps";

export const dynamic = "force-dynamic";

const FAIXA = { green: "🟢 Cavalheiro", amber: "🟡 Alerta", red: "🔴 Fuja" };

export default async function AdminLeadsPage() {
  await exigirAdmin();
  const admin = supabaseAdmin();
  const { data } = await admin.from("corte_leads").select("*").order("criado_em", { ascending: false }).limit(2000);
  const lista = data || [];
  const porFaixa = { green: 0, amber: 0, red: 0 };
  for (const l of lista) if (porFaixa[l.quiz_faixa] != null) porFaixa[l.quiz_faixa]++;

  // WhatsApp normalizados (+55…, únicos) p/ copiar e adicionar ao grupo manualmente
  const numeros = [...new Set(
    lista.map((l) => (l.whatsapp || "").replace(/\D/g, ""))
      .filter((d) => d.length >= 10)
      .map((d) => "+" + (d.startsWith("55") ? d : "55" + d))
  )];

  // funil interno (visitas → concluíram quiz → WhatsApp)
  const { data: fr } = await admin.rpc("corte_funil_resumo");
  const f = (Array.isArray(fr) ? fr[0] : fr) || {};
  const n = (x) => Number(x || 0);
  const pct = (a, b) => (n(b) > 0 ? Math.round((n(a) / n(b)) * 100) : 0);
  const visitas = n(f.visitas), concluiram = n(f.concluiram), leads = n(f.leads);

  return (
    <main className="screen">
      <div className="eyebrow">◈ Leads ◈</div>
      <h1 className="h-title">Funil do <em>quiz</em></h1>
      <p className="h-sub">
        {lista.length} lead(s) captado(s) no <code>/investigar</code>. 🟢 {porFaixa.green} · 🟡 {porFaixa.amber} · 🔴 {porFaixa.red}
      </p>

      {/* Funil interno: visitas → concluíram → WhatsApp (números nossos, exatos) */}
      <div className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <div className="c-k">◈ Funil (total · hoje) ◈</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[
            { lbl: "Visitas", v: visitas, h: n(f.visitas_hoje), ic: "👀" },
            { lbl: "Concluíram", v: concluiram, h: n(f.concluiram_hoje), ic: "✅" },
            { lbl: "WhatsApp", v: leads, h: n(f.leads_hoje), ic: "💬" },
          ].map((k) => (
            <div key={k.lbl} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 6px" }}>
              <div style={{ fontSize: 18 }}>{k.ic}</div>
              <div style={{ font: "900 24px var(--disp)", color: "var(--gold-2)" }}>{k.v}</div>
              <div className="opt" style={{ fontSize: 11 }}>{k.lbl}</div>
              <div className="opt" style={{ fontSize: 10.5, opacity: .8 }}>hoje: {k.h}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 2 }}>
          <span className="tag">Concluíram o quiz: {pct(concluiram, visitas)}% das visitas</span>
          <span className="tag" style={{ background: "var(--wine)", color: "#fdf3dd" }}>Deram WhatsApp: {pct(leads, concluiram)}% de quem concluiu</span>
          <span className="tag ghost">Geral (visita→lead): {pct(leads, visitas)}%</span>
        </div>
        <p className="opt" style={{ fontSize: 11.5 }}>
          O buraco entre <b>Concluíram</b> e <b>WhatsApp</b> é quem viu o Veredito mas não deixou o número. Contagem por visitante único (dedupa recarregamentos).
        </p>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <CopiarWhatsapps numeros={numeros} />
        <span className="opt" style={{ fontSize: 11.5 }}>Um por linha (+55…) — cole ao adicionar ao grupo.</span>
      </div>

      <div className="shelf" style={{ marginTop: 16 }}>
        {lista.map((l) => {
          const digits = (l.whatsapp || "").replace(/\D/g, "");
          const wa = digits ? (digits.startsWith("55") ? digits : "55" + digits) : "";
          return (
            <div key={l.whatsapp || l.email} className="memb">
              <div className="memb-top">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="memb-nome">
                    {FAIXA[l.quiz_faixa] || "— sem veredito"}
                    {l.quiz_total != null && <span className="tag" style={{ marginLeft: 6 }}>{l.quiz_total} pts</span>}
                    {l.virou_membro && <span className="tag" style={{ marginLeft: 6, background: "#2f6b48", color: "#fff" }}>MEMBRO</span>}
                  </div>
                  <div className="memb-email">💬 {l.whatsapp || "—"}{l.email ? ` · ${l.email}` : ""}</div>
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
