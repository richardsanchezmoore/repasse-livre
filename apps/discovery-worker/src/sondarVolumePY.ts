import "dotenv/config";
import fs from "node:fs";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

/**
 * TRÊS PERGUNTAS DE VOLUME, numa sonda só.
 *
 * 1. A ROLAGEM funciona no Marketplace agora? ⚠️ Meu teste anterior disse que
 *    não (altura travada em 2.602px, dez tentativas) — mas foi feito ANTES do
 *    login. Sessão logada pode mudar tudo, e se mudar, multiplica a captação:
 *    hoje pegamos 24 por faixa.
 *
 * 2. De quais GRUPOS o perfil já participa? Grupo em que já somos membros é
 *    fonte imediata, sem pedir entrada e sem esperar aprovação.
 *
 * 3. A ordem é mesmo "mais recentes"? ⚠️ Pedimos `sortBy=creation_time_descend`,
 *    mas o Facebook mistura "perto de você" e "recém anunciado" por conta
 *    própria. Se ele ignora o parâmetro, estamos vendo anúncio aleatório a cada
 *    visita, não o fresco — e a cadência de 4h10 perde o sentido.
 */
const PERFIL = "C:/claude/fb-sessao-py";
const URL_BUSCA =
  "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA&radius=60&minPrice=1000&minYear=1990&sortBy=creation_time_descend&topLevelVehicleType=car_truck";

const ctx = await chromium.launchPersistentContext(PERFIL, {
  headless: true,
  viewport: { width: 1366, height: 900 },
  locale: "es-PY",
  timezoneId: "America/Asuncion",
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});

// ───────────── 2) de quais grupos o perfil já participa? ─────────────
{
  const page = await ctx.newPage();
  // ⚠️ /groups/joins rende pouco; /groups/feed lista os grupos na lateral e
  // carrega mais com rolagem. Tento os dois e junto.
  await page.goto("https://www.facebook.com/groups/feed/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape").catch(() => {});
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 2000); await page.waitForTimeout(2500); }
  // a lateral tem o "Ver mais" dos grupos
  // ⚠️ `page.$()` devolve UM elemento (ou null) e não itera — usar locator, que
  // é a API atual e dá contagem.
  const verMais = page.locator("text=/ver mais|see more|mostrar mais/i");
  const quantos = await verMais.count().catch(() => 0);
  for (let k = 0; k < Math.min(quantos, 4); k++) {
    await verMais.nth(k).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 2500); await page.waitForTimeout(2000); }

  const grupos = await page.evaluate(() => {
    const vistos = new Map<string, string>();
    for (const a of document.querySelectorAll('a[href*="/groups/"]')) {
      const el = a as HTMLAnchorElement;
      const m = el.href.match(/facebook\.com\/groups\/([^/?#]+)/);
      const nome = (el.innerText ?? "").replace(/\s+/g, " ").trim();
      if (m && nome.length > 3 && nome.length < 70) vistos.set(m[1], nome);
    }
    return [...vistos.entries()];
  });

  console.log(`\n=== 2) GRUPOS EM QUE O PERFIL JÁ ESTÁ (${grupos.length}) ===`);
  // ⚠️ Marca os que cheiram a veículo: é onde a captação rende.
  const RX_CARRO = /(auto|carro|coche|vehicul|veicul|camioneta|motor|usados?|compra|venta|clasificad|4x4|camion)/i;
  for (const [id, nome] of grupos) {
    const alvo = RX_CARRO.test(nome) ? " ★" : "";
    console.log(`  ${nome.slice(0, 52).padEnd(52)} ${id}${alvo}`);
  }
  fs.writeFileSync("C:/claude/grupos-do-perfil.json", JSON.stringify(grupos, null, 1));
  await page.close();
}

await ctx.close();
