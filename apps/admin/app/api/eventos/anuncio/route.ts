import { NextResponse } from "next/server";
import { gerarParecerPorLink } from "@/lib/bia/gerarParecer";

/**
 * Endpoint interno do "event spine": o worker (todos os motores) chama isto no
 * salvarOportunidade quando detecta anúncio NOVO ou mudança de preço. Gera o
 * parecer do Copiloto na hora e grava. É onde, na Fase seguinte, entra o
 * matching de notificações (pré-definições do usuário → push/WhatsApp).
 *
 * Protegido por segredo compartilhado (ENRIQUECER_SECRET). GASTA LLM → fail-closed:
 * sem segredo configurado ou header errado = 401. Node runtime (service role +
 * crypto). Ver project_repasse_livre_copiloto_compra_instrumentacao.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const segredo = process.env.ENRIQUECER_SECRET;
  if (!segredo || req.headers.get("x-enriquecer-secret") !== segredo) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }

  let body: { link_origem?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "json_invalido" }, { status: 400 });
  }

  const link = body.link_origem?.trim();
  if (!link) return NextResponse.json({ erro: "link_origem_obrigatorio" }, { status: 400 });

  try {
    const status = await gerarParecerPorLink(link);
    return NextResponse.json({ status });
  } catch {
    return NextResponse.json({ erro: "falha" }, { status: 500 });
  }
}
