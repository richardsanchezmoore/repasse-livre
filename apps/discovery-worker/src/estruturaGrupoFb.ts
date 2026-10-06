import "dotenv/config";
import fs from "node:fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(StealthPlugin());

const URL = process.argv[2] ?? "https://www.facebook.com/groups/522751401231608";
const ctx = await chromium.launchPersistentContext("C:/claude/fb-sessao-py", {
  headless: true, viewport: { width: 1366, height: 900 },
  locale: "es-PY", timezoneId: "America/Asuncion",
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(5000);
await page.keyboard.press("Escape");
await page.waitForTimeout(1500);
await page.mouse.wheel(0, 1200);
await page.waitForTimeout(6000);

const out = await page.evaluate(() => {
  const feed = document.querySelector('[role="feed"]');
  if (!feed) return "sem feed";
  const linhas: string[] = [];
  [...feed.children].forEach((f, i) => {
    const txt = (f as HTMLElement).innerText ?? "";
    // tira a repeticao de alt="Facebook" das imagens
    const limpo = txt.replace(/(?:Facebook\s*)+/g, " ").replace(/\s+/g, " ").trim();
    if (!limpo) return;
    linhas.push(`\n=== filho [${i}] · ${txt.length} chars brutos → ${limpo.length} uteis ===\n${limpo.slice(0, 420)}`);
  });
  return linhas.join("\n");
});
console.log(out);
fs.writeFileSync("C:/claude/grupo-estrutura.txt", out);
await ctx.close();
