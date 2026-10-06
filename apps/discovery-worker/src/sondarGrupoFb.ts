import "dotenv/config";
import fs from "node:fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

/**
 * SONDA do feed de GRUPO — e a lição que ela já deu.
 *
 * ★ A rolagem FUNCIONA em grupo (ao contrário do Marketplace, onde a altura
 * travava em 2.602px): 1.977 → 16.799 px em seis rolagens.
 *
 * ⚠️ Mas o conteúdo novo NÃO aparece como `"message":{"text":...}` no HTML: os
 * posts seguintes chegam por GraphQL e são renderizados direto no DOM. Ler o
 * payload só enxerga o primeiro lote. O texto tem que sair do DOM RENDERIZADO.
 */
const URL = process.argv[2] ?? "https://www.facebook.com/groups/522751401231608";
const ROLAGENS = Number(process.argv[3] ?? 20);

const ctx = await chromium.launchPersistentContext("C:\\claude\\fb-sessao-py", {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "es-PY",
  timezoneId: "America/Asuncion",
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});

const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);

/**
 * Pega o texto de cada post do DOM.
 *
 * ⚠️ O Facebook não dá classe estável. O que é estável é a ESTRUTURA: cada post
 * do feed é um `[role="article"]`. Pego o innerText dele inteiro e limpo depois
 * — tentar isolar o "corpo" por seletor quebra na próxima mudança de layout.
 */
async function colher(): Promise<string[]> {
  return page.evaluate(() => {
    const vistos = new Set<string>();
    // ⚠️⚠️ COMENTÁRIO TAMBÉM É [role="article"] no Facebook, e fica ANINHADO
    // dentro do post. Sem este filtro a colheita vinha quase toda de comentário
    // — "Donde tenes amigos para ver", "En donde se encuentra" — e quase nenhum
    // anúncio. A regra estrutural que separa: post é o article de PRIMEIRO
    // NÍVEL. Preferida a qualquer seletor de classe, que o Facebook troca sem
    // avisar.
    const artigos = [...document.querySelectorAll('[role="article"]')];
    for (const art of artigos) {
      if (artigos.some((outro) => outro !== art && outro.contains(art))) continue;
      const txt = (art as HTMLElement).innerText?.replace(/\s+/g, " ").trim() ?? "";
      if (txt.length > 25) vistos.add(txt);
    }
    return [...vistos];
  });
}

/**
 * ⚠️⚠️ O FEED É VIRTUALIZADO — medido em 06/10/2026, e isso define o extrator.
 *
 * Contando os [role="article"] a cada rolagem: 2, 2, 2, 2, 0, 3, 2, 4, 0 —
 * enquanto a altura ia de 1.979 para 22.656px. O Facebook REMOVE do DOM o post
 * que sai da tela. Num dado instante existem 2 a 4; no fim da rolagem pode
 * haver ZERO.
 *
 * Por isso colher no final devolve quase nada. Tem que ACUMULAR a cada passo —
 * o post visto na rolagem 3 não existe mais na 8.
 */
const acumulado = new Set<string>();
for (let i = 0; i <= ROLAGENS; i++) {
  if (i > 0) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(3500);
  }
  const antes = acumulado.size;
  for (const p of await colher()) acumulado.add(p);
  const altura = await page.evaluate(() => document.body.scrollHeight);
  console.log(`  ${i === 0 ? "inicio " : `rolagem ${i}`}: ${String(acumulado.size).padStart(3)} acumulados (+${acumulado.size - antes}) · ${altura}px`);
}

const finais = [...acumulado];
fs.writeFileSync("C:/claude/grupo-posts.json", JSON.stringify(finais, null, 1));
console.log(`\n${finais.length} posts salvos em C:/claude/grupo-posts.json`);
console.log("\n=== amostra ===");
finais.slice(0, 6).forEach((p, i) => console.log(`\n[${i + 1}] ${p.slice(0, 220)}`));

await ctx.close();
