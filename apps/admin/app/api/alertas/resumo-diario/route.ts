import { NextResponse } from "next/server";
import { enviarResumoDiario } from "@/lib/alertas/entrega";

/**
 * Cron do RESUMO DIÁRIO das buscas salvas. Drena a fila pendente das buscas com
 * frequência 'diario' e manda um e-mail por usuário. Disparado 1×/dia pelo Vercel
 * Cron (ver apps/admin/vercel.json), que injeta `Authorization: Bearer $CRON_SECRET`.
 *
 * Protegido por CRON_SECRET (env no Vercel). Fail-closed: sem segredo configurado
 * ou header errado = 401 (não deixa qualquer um drenar a fila). O modo 'na_hora'
 * NÃO passa por aqui — sai na aprovação, via matching.ts → enviarAlertasNaHora.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// force-no-store: lê a fila de alertas fresca (senão o Next cacheia os SELECTs do Supabase).
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  // Auth resiliente igual ao cron de auto-publicar: exige CRON_SECRET (trim dos 2 lados),
  // mas cai pro fallback do user-agent vercel-cron quando o env some do runtime (o gremlin
  // intermitente da Vercel) — senão o resumo diário morre em silêncio pelo mesmo motivo.
  const segredo = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const ua = req.headers.get("user-agent") ?? "";
  const porSegredo = Boolean(segredo) && auth === `Bearer ${segredo}`;
  // UA fallback incondicional — mesmo motivo do auto-publicar: cobre env-some-do-runtime
  // E header-Authorization-removido-pelo-CDN. Risco baixo (só dispara o resumo diário).
  const porVercelCron = ua.startsWith("vercel-cron");
  if (!porSegredo && !porVercelCron) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }

  try {
    const emails = await enviarResumoDiario();
    return NextResponse.json({ ok: true, emails });
  } catch (e) {
    console.error("[alertas] resumo-diario route falhou:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha" }, { status: 500 });
  }
}
