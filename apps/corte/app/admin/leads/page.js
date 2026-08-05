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

  const [{ data: leadsRows }, { data: vis }, { data: con }, { data: fr }] = await Promise.all([
    admin.from("corte_leads").select("*").order("criado_em", { ascending: false }).limit(3000),
    admin.from("corte_funil").select("criado_em, quiz_slug").eq("tipo", "visita").order("criado_em", { ascending: false }).limit(3000),
    admin.from("corte_funil").select("criado_em, quiz_slug").eq("tipo", "quiz_fim").order("criado_em", { ascending: false }).limit(3000),
    admin.rpc("corte_funil_resumo"),
  ]);

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
      <PainelLeads kpi={kpi} numeros={numeros} leads={leads} visita={visita} conclu={conclu} checkout={checkout} />
    </main>
  );
}
