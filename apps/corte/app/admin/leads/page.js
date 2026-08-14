import { exigirAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PainelLeads from "@/components/PainelLeads";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const fmtBR = (t) => new Date(t).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const hourBR = (t) => Number(new Date(t).toLocaleString("en-US", { timeZone: TZ, hour: "2-digit", hour12: false })) % 24;
const diaBR = (t) => new Date(t).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const histo = (rows) => { const h = Array(24).fill(0); for (const r of rows) h[hourBR(r.criado_em)]++; return h; };

export default async function AdminLeadsPage() {
  await exigirAdmin();
  const admin = supabaseAdmin();

  const [{ data: leadsRows }, { data: vis }, { data: con }, { data: fr }, { data: mpRows }] = await Promise.all([
    admin.from("corte_leads").select("*").order("criado_em", { ascending: false }).limit(3000),
    admin.from("corte_funil").select("criado_em, quiz_slug").eq("tipo", "visita").order("criado_em", { ascending: false }).limit(3000),
    admin.from("corte_funil").select("criado_em, quiz_slug").eq("tipo", "quiz_fim").order("criado_em", { ascending: false }).limit(3000),
    admin.rpc("corte_funil_resumo"),
    admin.from("corte_funil").select("vid, quiz_slug").eq("tipo", "mulher_passo").limit(20000),
  ]);

  // ── Funil da landing /mulher: distintos (vid) por card ──
  const CARDS_MULHER = ["Abertura", "Os 3 caminhos", "A lacuna (Tipo 4)", "Exemplos", "Chat com a Lady", "Oferta"];
  const funilMulher = CARDS_MULHER.map((nome, i) => ({
    nome, passo: i + 1,
    distintos: new Set((mpRows || []).filter((r) => r.quiz_slug === String(i + 1)).map((r) => r.vid).filter(Boolean)).size,
  }));

  const lista = leadsRows || [], visitas = vis || [], concl = con || [];
  const f = (Array.isArray(fr) ? fr[0] : fr) || {};
  const n = (x) => Number(x || 0);
  const pct = (a, b) => (n(b) > 0 ? Math.round((n(a) / n(b)) * 100) : 0);

  const numeros = [...new Set(
    lista.map((l) => (l.whatsapp || "").replace(/\D/g, "")).filter((d) => d.length >= 10).map((d) => "+" + (d.startsWith("55") ? d : "55" + d))
  )];

  const leads = { porHora: histo(lista), cards: lista.map((l) => ({ wa: l.whatsapp || "", faixa: l.quiz_faixa, total: l.quiz_total, quando: fmtBR(l.criado_em), membro: l.virou_membro })) };
  const visita = { total: visitas.length, porHora: histo(visitas), log: visitas.slice(0, 400).map((v) => ({ quando: fmtBR(v.criado_em), slug: v.quiz_slug })) };
  const conclu = { total: concl.length, porHora: histo(concl), log: concl.slice(0, 400).map((v) => ({ quando: fmtBR(v.criado_em), slug: v.quiz_slug })) };

  // ── Checkout (pré-Cakto): quem preencheu o pop-up e foi pro pagamento ──
  const hojeBR = diaBR(new Date());
  const chk = lista.filter((l) => l.chegou_checkout);
  const chkSort = [...chk].sort((a, b) => new Date(b.checkout_em || b.criado_em) - new Date(a.checkout_em || a.criado_em));
  const checkout = {
    total: chk.length,
    hoje: chk.filter((l) => l.checkout_em && diaBR(l.checkout_em) === hojeBR).length,
    compraram: chk.filter((l) => l.virou_membro).length,
    abandonaram: chk.filter((l) => !l.virou_membro).length,
    porHora: histo(chk.map((l) => ({ criado_em: l.checkout_em || l.criado_em }))),
    cards: chkSort.map((l) => ({ nome: l.nome || "", wa: l.whatsapp || "", email: l.email || "", quando: fmtBR(l.checkout_em || l.criado_em), membro: l.virou_membro })),
  };

  const kpi = {
    visitas: n(f.visitas), concluiram: n(f.concluiram), leads: n(f.leads),
    vh: n(f.visitas_hoje), ch: n(f.concluiram_hoje), lh: n(f.leads_hoje),
    pConcl: pct(f.concluiram, f.visitas), pLead: pct(f.leads, f.concluiram), pGeral: pct(f.leads, f.visitas),
    checkouts: checkout.total, coh: checkout.hoje,
    pComprou: pct(checkout.compraram, checkout.total),
  };

  return (
    <main className="screen">
      <div className="eyebrow">◈ Leads ◈</div>
      <h1 className="h-title">Funil do <em>quiz</em></h1>
      <p className="h-sub">Visitas → concluíram → WhatsApp, com o horário de pico em Brasília.</p>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="c-k">◈ Funil da landing /mulher ◈</div>
        <div className="c-t" style={{ marginBottom: 4 }}>Onde elas <em>param</em></div>
        <div className="c-p" style={{ marginBottom: 14 }}>Pessoas distintas que chegaram a cada card (e a queda entre eles).</div>
        {funilMulher.map((c, i) => {
          const base = funilMulher[0].distintos || 0;
          const larg = base > 0 ? Math.round((c.distintos / base) * 100) : 0;
          const anterior = i > 0 ? funilMulher[i - 1].distintos : null;
          const queda = anterior && anterior > 0 ? Math.round((1 - c.distintos / anterior) * 100) : 0;
          return (
            <div key={i} style={{ margin: "0 0 11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ font: "600 13.5px var(--serif)", color: "var(--ink)" }}>
                  <b style={{ color: "var(--gold)", marginRight: 6 }}>{c.passo}</b>{c.nome}
                </span>
                <span style={{ font: "800 14px var(--disp)", color: "var(--wine)" }}>
                  {c.distintos}
                  {queda > 0 && <span style={{ font: "700 11px var(--ui)", color: queda >= 40 ? "#a2333f" : "var(--ink-soft)", marginLeft: 7 }}>▼{queda}%</span>}
                </span>
              </div>
              <div className="bar"><span style={{ width: larg + "%" }} /></div>
            </div>
          );
        })}
        <div className="c-p" style={{ marginTop: 10, fontSize: 12.5, fontStyle: "italic" }}>
          O maior ▼ é onde a copy/experiência mais perde — o alvo do próximo ajuste.
        </div>
      </section>

      <PainelLeads kpi={kpi} numeros={numeros} leads={leads} visita={visita} conclu={conclu} checkout={checkout} />
    </main>
  );
}
