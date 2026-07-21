import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { enviarEventoCapi } from "@/lib/metaCapi";

/**
 * Endpoint de DIAGNÓSTICO do CAPI (temporário/reutilizável). Dispara um evento Purchase
 * sob demanda pra provar que META_PIXEL_ID + META_CAPI_TOKEN chegaram no runtime e que a
 * Graph API aceita — SEM precisar de venda real.
 *
 * Admin-only (abre logado no navegador). EXIGE `?test=CODE` (o código de "Eventos de teste"
 * do Events Manager) pra o evento ir pro modo TESTE, não pra produção — assim não polui
 * conversões com uma venda falsa.
 *
 * Lê a resposta da Meta e devolve: `envs` (o token aplicou?) + `resultado` (a Meta aceitou?).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (usuario?.role !== "admin") {
    return NextResponse.json({ erro: "apenas_admin" }, { status: 403 });
  }

  const testCode = new URL(req.url).searchParams.get("test")?.trim();
  if (!testCode) {
    return NextResponse.json(
      { erro: "informe ?test=CODE (Events Manager → Eventos de teste) — evita mandar venda falsa pra produção" },
      { status: 400 }
    );
  }

  const envs = {
    hasPixel: Boolean(process.env.META_PIXEL_ID?.trim()),
    hasToken: Boolean(process.env.META_CAPI_TOKEN?.trim()),
  };

  const resultado = await enviarEventoCapi({
    evento: "Purchase",
    eventId: randomUUID(),
    email: "teste-capi@repasselivre.com",
    externalId: usuario.id,
    value: 1,
    currency: "BRL",
    eventSourceUrl: "https://repasselivre.com/planos",
    testEventCode: testCode,
  });

  return NextResponse.json({
    envs,
    resultado,
    dica: envs.hasToken
      ? "Se resultado.ok=true, veja o Purchase em Events Manager → Eventos de teste (origem Servidor)."
      : "hasToken=false → o env NÃO aplicou no runtime. Re-salva META_CAPI_TOKEN + redeploy (lição do CRON_SECRET).",
  });
}
