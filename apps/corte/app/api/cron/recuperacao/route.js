import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enviarEmailRecuperacao } from "@/lib/emailAcesso";

// Recuperação de abandono: quem preencheu o pop-box (chegou_checkout) e NÃO
// comprou (virou_membro) recebe 1 e-mail gentil da Lady. Janela: 45min–7 dias
// após o checkout (dá tempo do PIX cair; e não incomoda gente muito antiga).
// Marca recuperado_em pra nunca enviar duas vezes.
//
// Agenda: Vercel Cron (vercel.json) OU scheduler externo, sempre com o segredo:
//   GET /api/cron/recuperacao   Header: Authorization: Bearer <CRON_SECRET>
//   (ou ?secret=<CRON_SECRET> pra schedulers que não mandam header)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processar(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, erro: "CRON_SECRET não configurado" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  if (auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }

  const agora = Date.now();
  const ateHa = new Date(agora - 45 * 60 * 1000).toISOString();   // pelo menos 45min atrás
  const desdeHa = new Date(agora - 7 * 24 * 3600 * 1000).toISOString(); // no máximo 7 dias

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("corte_leads")
    .select("email, nome, virou_membro, checkout_em")
    .eq("chegou_checkout", true)
    .is("recuperado_em", null)
    .lt("checkout_em", ateHa)
    .gt("checkout_em", desdeHa)
    .order("checkout_em", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

  const alvos = (data || []).filter((l) => !l.virou_membro && l.email && String(l.email).includes("@")).slice(0, 50);
  let enviados = 0, falhas = 0;
  for (const l of alvos) {
    const r = await enviarEmailRecuperacao({ email: l.email, nome: l.nome });
    if (r.ok) {
      enviados++;
      await admin.from("corte_leads").update({ recuperado_em: new Date().toISOString() }).eq("email", l.email);
    } else {
      falhas++;
      console.error("[recuperacao] falhou:", l.email, r.erro);
    }
  }
  return NextResponse.json({ ok: true, candidatos: alvos.length, enviados, falhas });
}

export async function GET(req) { return processar(req); }
export async function POST(req) { return processar(req); }
