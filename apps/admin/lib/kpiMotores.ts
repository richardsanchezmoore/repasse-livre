import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * KPI "captado" por motor pro painel Motor de Descoberta — soma `novos` (descobertos)
 * e `elegiveis` (oportunidades) das runs, por fonte. Traz HOJE (por motor) + o total de
 * ONTEM (comparativo rápido). Fuso de Brasília. Página force-dynamic → cada recarga
 * reflete o último cron. Exclui as linhas de reinício-roteador (não são captação).
 */

export interface CapturaMotor {
  novos: number;
  elegiveis: number;
  runs: number;
}
export type ChaveMotor = "olx" | "webmotors" | "ml" | "facebook";
export type CapturaHoje = Record<ChaveMotor, CapturaMotor>;

export interface CapturaMotores {
  hoje: CapturaHoje;
  ontem: CapturaHoje; // por motor também (comparativo em cada card)
}

/** ISO do início do dia (offsetDias atrás) em America/Sao_Paulo (-03:00). BR não tem mais DST. */
function inicioDoDiaBRT(offsetDias = 0): string {
  const base = new Date(Date.now() + offsetDias * 86_400_000);
  const dataBRT = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
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

export async function buscarCapturaMotores(): Promise<CapturaMotores> {
  const inicioHoje = new Date(inicioDoDiaBRT(0)).getTime();
  const inicioOntem = inicioDoDiaBRT(-1);

  // Uma leitura só cobrindo ontem + hoje; separamos por timestamp.
  const { data } = await supabaseAdmin
    .from("discovery_runs")
    .select("categoria_url, novos, elegiveis, iniciado_em")
    .gte("iniciado_em", inicioOntem);

  const vazio = (): CapturaMotor => ({ novos: 0, elegiveis: 0, runs: 0 });
  const hoje: CapturaHoje = { olx: vazio(), webmotors: vazio(), ml: vazio(), facebook: vazio() };
  const ontem: CapturaHoje = { olx: vazio(), webmotors: vazio(), ml: vazio(), facebook: vazio() };

  for (const linha of (data ?? []) as Array<{ categoria_url: string; novos: number | null; elegiveis: number | null; iniciado_em: string }>) {
    const k = motorDaUrl(linha.categoria_url ?? "");
    if (!k) continue;
    const alvo = new Date(linha.iniciado_em).getTime() >= inicioHoje ? hoje : ontem;
    alvo[k].novos += linha.novos ?? 0;
    alvo[k].elegiveis += linha.elegiveis ?? 0;
    alvo[k].runs += 1;
  }
  return { hoje, ontem };
}
