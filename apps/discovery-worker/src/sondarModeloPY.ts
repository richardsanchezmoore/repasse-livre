import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairIdsDaBusca } from "./facebookMarketplaceService.js";

/**
 * SONDA DE BURACO DE COBERTURA — existe o carro, e a gente não pega?
 *
 * ★ A PERGUNTA (Gustavo, 07/10/2026): *"observar se não estamos sendo induzidos
 * só para determinados modelos"*. O catálogo JDM acusou 34 modelos que nunca
 * apareceram, dois segmentos inteiros zerados (van_luxo, sedan_luxo) — e os
 * nomes estão ausentes até do TEXTO CRU, então não é falha do normalizador.
 *
 * ⚠️⚠️ MAS ISSO AINDA NÃO PROVA NADA. 317 anúncios para ~100 modelos distintos é
 * amostra pequena: modelo de cauda longa tira zero por sorte, não por indução. E
 * o catálogo é em parte pesquisa, não presença verificada na praça.
 *
 * ★ A SONDA É O ÁRBITRO: busca o termo direto, por palavra-chave (que é outro
 * caminho que o da varredura por faixa de preço), e confere contra a base.
 *
 *   · acha anúncios que NÃO temos  → buraco REAL de cobertura
 *   · acha pouco ou nada           → o modelo não circula aqui; o catálogo que
 *                                    estava otimista, e a captação está certa
 *
 * ⚠️ É a conta do Gustavo e ela é usável. Poucos termos, pausa entre eles, e
 * respeita a MESMA trava da varredura — duas instâncias no mesmo perfil brigam
 * pelo diretório e é assim que a sessão morre.
 */
const TERMOS = (process.env.SONDA_TERMOS ?? "hiace,aqua,crown,noah,wish,alphard").split(",");
const PRACAS: [string, string][] = [
  ["Ciudad del Este", "108383999186596"],
  ["Asunción", "asuncion"],
];
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tomarTrava(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ varredura rodando (pid ${pid}). Saindo.`); return false; } } catch { /* órfã */ }
  } catch { /* sem trava */ }
  fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}
function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch { /* já foi */ }
}

async function main() {
  if (!tomarTrava()) return;

  const { data } = await supabase.from("opportunities").select("link_origem").eq("pais", "PY");
  const nossos = new Set((data ?? []).map((o) => String(o.link_origem).match(/item\/(\d+)/)?.[1]).filter(Boolean) as string[]);
  console.log(`base: ${nossos.size} anúncios conhecidos\n`);
  console.log("  termo      praça              achados   JÁ TEMOS   ★ INÉDITOS");

  for (const termo of TERMOS) {
    for (const [nome, loc] of PRACAS) {
      const url = `https://www.facebook.com/marketplace/${loc}/search/?query=${encodeURIComponent(termo)}&locale=es_LA`;
      try {
        const html = await baixarLogado(url, 2500);
        const ids = extrairIdsDaBusca(html);
        const ineditos = ids.filter((i) => !nossos.has(i));
        const marca = ineditos.length >= 5 ? "  ⚠️ BURACO" : ineditos.length === 0 && ids.length === 0 ? "  (não circula?)" : "";
        console.log(`  ${termo.padEnd(10)} ${nome.padEnd(18)} ${String(ids.length).padStart(5)}   ${String(ids.length - ineditos.length).padStart(6)}   ${String(ineditos.length).padStart(8)}${marca}`);
      } catch (e) {
        if (e instanceof SessaoExpirada) { console.log("\n⚠️ sessão caiu — refaça o login (C:\claude\login-fb-py.cmd)"); return; }
        console.log(`  ${termo.padEnd(10)} ${nome.padEnd(18)} ✗ ${(e as Error).message.slice(0, 40)}`);
      }
      await dormir(6000);
    }
  }
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltarTrava(); });
