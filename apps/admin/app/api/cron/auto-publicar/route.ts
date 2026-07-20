import { NextResponse } from "next/server";
import { buscarModoPublicacao } from "@/lib/configWorker";
import { publicarDescobertasPendentes, buscarUltimaPublicacaoMs, marcarUltimaPublicacao } from "@/lib/publicacao";

/**
 * Cron da PUBLICAÇÃO AUTOMÁTICA. Lê `worker_config.MODO_PUBLICACAO` e aprova os
 * `descoberta` pendentes conforme o modo escolhido no painel (Configurações → Geral):
 *  - "manual": no-op (o admin aprova na mão, como sempre).
 *  - "automatico": aprova a cada run (o Vercel Cron bate de 15 em 15 min → ~real-time).
 *  - "horaria": aprova no máximo 1 lote por hora (auto-limita pela janela em worker_config).
 *
 * Roda no mesmo caminho da aprovação manual (núcleo `aprovarComAlertas`), então os
 * alertas "na hora" das buscas salvas saem igual. Disparado pelo Vercel Cron (ver
 * apps/admin/vercel.json), que injeta `Authorization: Bearer $CRON_SECRET`.
 *
 * Fail-closed: sem `CRON_SECRET` ou header errado = 401. Config ausente/inválida = "manual"
 * (nunca publica sozinho por acidente).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UMA_HORA_MS = 60 * 60 * 1000;

export async function GET(req: Request): Promise<Response> {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }

  try {
    const modo = await buscarModoPublicacao();
    if (modo === "manual") {
      return NextResponse.json({ ok: true, modo, aprovados: 0 });
    }

    // Modo horário: só publica se já passou 1h do último lote.
    if (modo === "horaria") {
      const ultima = await buscarUltimaPublicacaoMs();
      if (ultima !== null && Date.now() - ultima < UMA_HORA_MS) {
        return NextResponse.json({ ok: true, modo, aprovados: 0, motivo: "throttle_1h" });
      }
    }

    const aprovados = await publicarDescobertasPendentes();

    // Fecha a janela de 1h só quando de fato publicou algo (não atrasa o 1º da janela).
    if (modo === "horaria" && aprovados > 0) {
      await marcarUltimaPublicacao();
    }

    return NextResponse.json({ ok: true, modo, aprovados });
  } catch (e) {
    console.error("[publicacao] auto-publicar falhou:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha" }, { status: 500 });
  }
}
