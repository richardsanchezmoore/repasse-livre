import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * KPI "captado HOJE" por motor pro painel Motor de Descoberta — soma os `novos`
 * (descobertos) e `elegiveis` (oportunidades salvas) de todas as runs do dia (fuso
 * de Brasília), por fonte. A página é force-dynamic, então cada recarga reflete o
 * estado após o último cron. Exclui as linhas de reinício-roteador (não são captação).
 */

export interface CapturaMotor {
  novos: number;
  elegiveis: number;
  runs: number;
}
export type ChaveMotor = "olx" | "webmotors" | "ml" | "facebook";
export type CapturaHoje = Record<ChaveMotor, CapturaMotor>;

/** ISO do início do dia corrente em America/Sao_Paulo (-03:00). */
function inicioDoDiaBRT(): string {
  // en-CA formata como YYYY-MM-DD; monta a meia-noite de Brasília.
  const dataBRT = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${dataBRT}T00:00:00-03:00`;
}

function motorDaUrl(url: string): ChaveMotor | null {
  const u = url.toLowerCase();
  if (u.includes("reinicio")) return null; // linha de reboot, não é captação
  if (u.includes("olx")) return "olx";
  if (u.includes("webmotors")) return "webmotors";
  if (u.includes("mercadoli")) return "ml"; // mercadolivre.com.br e mercadolibre
  if (u.includes("facebook")) return "facebook";
  return null;
}

export async function buscarCapturaHojePorMotor(): Promise<CapturaHoje> {
  const { data } = await supabaseAdmin
    .from("discovery_runs")
    .select("categoria_url, novos, elegiveis")
    .gte("iniciado_em", inicioDoDiaBRT());

  const vazio = (): CapturaMotor => ({ novos: 0, elegiveis: 0, runs: 0 });
  const r: CapturaHoje = { olx: vazio(), webmotors: vazio(), ml: vazio(), facebook: vazio() };

  for (const linha of (data ?? []) as Array<{ categoria_url: string; novos: number | null; elegiveis: number | null }>) {
    const k = motorDaUrl(linha.categoria_url ?? "");
    if (!k) continue;
    r[k].novos += linha.novos ?? 0;
    r[k].elegiveis += linha.elegiveis ?? 0;
    r[k].runs += 1;
  }
  return r;
}
