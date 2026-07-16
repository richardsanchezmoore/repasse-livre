import "dotenv/config";
import { lerConfig } from "./supabaseClient.js";

/**
 * Lista os SLUGS das regiões do Facebook cadastradas no painel (worker_config.FACEBOOK_REGIOES),
 * um por linha, em stdout. É a fonte da verdade para o agendamento local: o
 * `C:\claude\sincronizar-crons-fb.ps1` consome esta saída pra criar/atualizar/remover as tarefas
 * `RL-fb-<slug>` do Agendador do Windows. Painel manda; agendador obedece.
 *
 * O slug tem que ser IDÊNTICO ao de `slugRegiao` no facebookMain (é o argumento que o
 * run-fb.cmd passa e que o worker usa pra achar a região). Por isso a função é replicada aqui
 * com o mesmo formato: slug(nome)-uf. Ver project_repasse_livre_facebook_marketplace_motor_descoberta.
 */
const slug = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface RegiaoPainel {
  nome?: string;
  url?: string;
  uf?: string;
}

async function main(): Promise<void> {
  const raw = await lerConfig("FACEBOOK_REGIOES");
  let regioes: RegiaoPainel[] = [];
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(v)) regioes = (v as RegiaoPainel[]).filter((r) => r?.nome && r?.url);
  } catch {
    console.error("[fb] FACEBOOK_REGIOES inválido (JSON não parseia) — nada a listar.");
    process.exit(1);
  }
  for (const r of regioes) {
    console.log([slug(r.nome ?? ""), r.uf ? r.uf.toLowerCase() : ""].filter(Boolean).join("-"));
  }
}

main().catch((erro) => {
  console.error("[fb] falha ao listar regiões:", erro);
  process.exit(1);
});
