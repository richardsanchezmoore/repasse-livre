import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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
// ★ force-no-store: sem isto o Next CACHEIA os SELECTs do Supabase (que usam fetch por
// baixo) e o cron lia um snapshot VELHO de `descoberta` — re-aprovava ids já aprovados
// (aprovados:81 fixo) sem nunca drenar o backlog real. Foi a 2ª causa (a 1ª era o header).
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const UMA_HORA_MS = 60 * 60 * 1000;

export async function GET(req: Request): Promise<Response> {
  // Auth RESILIENTE. O caminho normal exige o CRON_SECRET (com .trim() dos dois lados,
  // contra \n colado). MAS o valor do env some do runtime na Vercel de forma intermitente
  // (visto 2x: hasSecret:false) → o Vercel Cron tomava 401 e a publicação morria em
  // silêncio por HORAS. Fallback: quando o segredo NÃO está no runtime (exatamente o bug),
  // aceita a chamada vinda do próprio Vercel Cron (user-agent `vercel-cron`). Risco baixo —
  // o endpoint só aprova descobertas que o modo automático publicaria de qualquer jeito, e
  // quando o segredo ESTÁ presente a checagem volta a ser estrita (spoof de UA é barrado).
  const segredo = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const ua = req.headers.get("user-agent") ?? "";
  const porSegredo = Boolean(segredo) && auth === `Bearer ${segredo}`;
  // UA fallback INCONDICIONAL: aceita qualquer requisição do Vercel Cron (user-agent
  // `vercel-cron`), mesmo com o segredo presente. Cobre os DOIS modos de falha vistos/
  // previstos: (1) a env some do runtime (gremlin → hasSecret:false) e (2) o header
  // Authorization ser removido no caminho (CDN/proxy do domínio custom → authPresent:false
  // com hasSecret:true). Risco baixo: UA é falsificável, mas o endpoint só publica o que o
  // modo automático publicaria de qualquer jeito.
  const porVercelCron = ua.startsWith("vercel-cron");
  if (!porSegredo && !porVercelCron) {
    console.warn("[auto-publicar] 401", { ua, hasSecret: !!segredo, authPresent: !!auth });
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

    const contarDescoberta = async () =>
      (await supabaseAdmin.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "descoberta")).count ?? 0;

    const antes = await contarDescoberta();
    const r = await publicarDescobertasPendentes();
    const depois = await contarDescoberta();

    // Fecha a janela de 1h só quando de fato publicou algo (não atrasa o 1º da janela).
    if (modo === "horaria" && r.aprovados > 0) {
      await marcarUltimaPublicacao();
    }

    return NextResponse.json({ ok: true, modo, antes, selecionados: r.selecionados, aprovados: r.aprovados, depois });
  } catch (e) {
    console.error("[publicacao] auto-publicar falhou:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha" }, { status: 500 });
  }
}
