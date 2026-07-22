import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { registrarAlertasParaAprovados } from "@/lib/alertas/matching";

/**
 * Núcleo de PUBLICAÇÃO das oportunidades — aprova (status → "aprovada"), dispara os
 * alertas "na hora" das buscas salvas e revalida as páginas públicas.
 *
 * ⚠️ SEM guarda de auth de propósito, e mantido FORA de `app/actions.ts` ("use server")
 * justamente pra NÃO virar um endpoint público sem guarda. Os dois chamadores autenticam
 * do seu jeito antes de chamar: o server action `aprovarOportunidade*` (via `exigirAdmin`)
 * e o cron `/api/cron/auto-publicar` (via `CRON_SECRET`).
 *
 * AWAIT em `registrarAlertasParaAprovados` (não fire-and-forget): em serverless a lambda é
 * reciclada após a resposta e mataria o e-mail pendente. O matching é best-effort interno
 * (try/catch, nunca lança), então aguardar não arrisca derrubar a aprovação.
 */
export async function aprovarComAlertas(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  // .select("id") pra saber quantas linhas o UPDATE de fato afetou (diagnóstico: no
  // endpoint da Vercel o update não estava persistindo apesar de não dar erro).
  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .update({ status: "aprovada" })
    .in("id", ids)
    .select("id");
  if (error) {
    throw new Error(`Falha ao aprovar oportunidades: ${error.message}`);
  }
  await registrarAlertasParaAprovados(ids);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  return data?.length ?? 0;
}

/**
 * Publicação AUTOMÁTICA: pega os `descoberta` mais antigos (FIFO por data_captura) e
 * aprova, em lote LIMITADO — pra caber no `maxDuration` do cron e não estourar um burst
 * de e-mail. Backlog maior que o limite dreno nos runs seguintes (cron a cada 15 min).
 * Devolve quantos aprovou.
 */
export async function publicarDescobertasPendentes(limite = 300): Promise<{ selecionados: number; aprovados: number }> {
  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("id")
    .eq("status", "descoberta")
    .order("data_captura", { ascending: true })
    .limit(limite);
  if (error) {
    throw new Error(`Falha ao listar descobertas pendentes: ${error.message}`);
  }
  const ids = (data ?? []).map((o) => o.id as string);
  const aprovados = await aprovarComAlertas(ids);
  return { selecionados: ids.length, aprovados };
}

// ── Throttle do modo "horária" (1 lote por hora), guardado em worker_config ────────────
const CHAVE_ULTIMA = "PUBLICACAO_ULTIMA_EM";

/** Timestamp (ms) da última publicação automática, ou null se nunca houve. */
export async function buscarUltimaPublicacaoMs(): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", CHAVE_ULTIMA)
    .maybeSingle();
  const t = Date.parse((data?.valor ?? "").trim());
  return Number.isFinite(t) ? t : null;
}

/** Marca "agora" como a última publicação automática (fecha a janela de 1h). */
export async function marcarUltimaPublicacao(): Promise<void> {
  const agora = new Date().toISOString();
  await supabaseAdmin
    .from("worker_config")
    .upsert({ chave: CHAVE_ULTIMA, valor: agora, atualizado_em: agora }, { onConflict: "chave" });
}
