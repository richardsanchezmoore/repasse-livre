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
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  // .trim() dos dois lados: um \n colado no valor do CRON_SECRET faria `Bearer X` não
  // bater com `Bearer X\n` e cairia em 401 (mesma pegadinha do cron de auto-publicar).
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo || req.headers.get("authorization")?.trim() !== `Bearer ${segredo}`) {
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
