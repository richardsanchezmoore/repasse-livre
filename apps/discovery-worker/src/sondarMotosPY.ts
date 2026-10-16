import "dotenv/config";
import fs from "node:fs";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { lerConfig } from "./supabaseClient.js";

/**
 * ═══ SONDA: EXISTE CATEGORIA DE MOTO NAS PRAÇAS? ══════════════════════════
 *
 * ★ Antes de desenhar /motos, a pergunta que decide tudo: o Facebook devolve
 * estoque de moto por praça, e quanto?
 *
 * ⚠️⚠️ POR QUE A SONDA VEM ANTES DA PÁGINA: a base tem 27 motos, 18 na
 * vitrine — todas entradas POR ACIDENTE, porque o Marketplace mistura. Abrir
 * uma categoria com 18 anúncios seria anunciar uma seção vazia. E tentar achar
 * moto por TEXTO foi medido e reprovado: o padrão de cilindrada casa com
 * "1.1cc", "Motor 1300" e "Ort 720" — 339 candidatas, quase todas carro.
 *
 * ★ A URL das praças aponta para `/carros/`, que é um slug de CATEGORIA do
 * Marketplace. A hipótese barata é que `/motos/` funcione igual. Esta sonda
 * testa isso sem mexer em nada: só baixa e conta ids.
 *
 * ⚠️ Usa a MESMA sessão do Playwright que o ciclo, então espera a trava em vez
 * de sair — e o pacing é lento de propósito: é sondagem, não varredura, e a
 * conta não pode ser queimada por uma pergunta.
 *
 * Uso: npx tsx src/sondarMotosPY.ts
 */
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
const ESPERA_TRAVA_MIN = 180;
const PAUSA_MS = 6000;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

function travaOcupada(): number | null {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) return null;
    try { process.kill(pid, 0); return pid; } catch { return null; }
  } catch { return null; }
}
async function esperarEtomarTrava(): Promise<boolean> {
  for (let i = 0; i < ESPERA_TRAVA_MIN * 2; i++) {
    const pid = travaOcupada();
    if (pid === null) {
      fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
      return true;
    }
    if (i === 0) console.log(`perfil ocupado (pid ${pid}) — esperando a trava (até ${ESPERA_TRAVA_MIN} min)`);
    await dormir(30_000);
  }
  console.log("⛔ a trava não liberou. Saindo.");
  return false;
}
function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch { /* já foi */ }
}

async function main() {
  if (!(await esperarEtomarTrava())) return;

  const bruto = await lerConfig("FACEBOOK_REGIOES");
  const regioes = (JSON.parse(String(bruto ?? "[]")) as { nome: string; url: string; uf?: string }[])
    .filter((r) => String(r.uf ?? "").startsWith("PY-"));

  console.log(`${regioes.length} praças paraguaias\n`);
  console.log("praça                         carros   motos   motos/carros");

  let totalMotos = 0;
  for (const r of regioes) {
    try {
      // ⚠️ Troca só o slug da categoria, preservando praça, raio e locale: a
      // comparação só vale se a única diferença for a categoria.
      const urlMotos = r.url.replace("/carros/", "/motos/");
      if (urlMotos === r.url) {
        console.log(`  ${r.nome.padEnd(28)} (URL não tem /carros/ — pulada)`);
        continue;
      }

      const htmlCarros = await baixarLogado(r.url, 4000);
      const nCarros = new Set([...htmlCarros.matchAll(/marketplace\/item\/(\d{8,})/g)].map((m) => m[1])).size;
      await dormir(PAUSA_MS);

      const htmlMotos = await baixarLogado(urlMotos, 4000);
      const idsMotos = new Set([...htmlMotos.matchAll(/marketplace\/item\/(\d{8,})/g)].map((m) => m[1]));
      totalMotos += idsMotos.size;

      const razao = nCarros ? (idsMotos.size / nCarros).toFixed(2) : "—";
      console.log(`  ${r.nome.padEnd(28)} ${String(nCarros).padStart(6)}  ${String(idsMotos.size).padStart(6)}   ${razao}`);
      await dormir(PAUSA_MS);
    } catch (e) {
      if (e instanceof SessaoExpirada) { console.log("\n❌ SESSÃO CAÍDA — parando."); break; }
      console.log(`  ${r.nome.padEnd(28)} ✗ ${(e as Error).message.slice(0, 40)}`);
      await dormir(PAUSA_MS);
    }
  }

  console.log(`\ntotal de ids de moto numa passada: ${totalMotos}`);
  console.log("⚠️ Isto é UMA página por praça, sem rolagem — o estoque real é maior.");
  await fecharContexto();
}

main()
  .catch((e) => { console.error("falhou:", (e as Error).message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltarTrava(); });
