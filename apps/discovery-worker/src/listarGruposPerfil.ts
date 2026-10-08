import "dotenv/config";
import fs from "node:fs";
// ★ Mesmo navegador do resto do motor: um lugar só para stealth, viewport e
// caminho de sessão.
import { abrirContexto, fecharContexto } from "./navegadorFacebook.js";

/**
 * De quais GRUPOS o perfil participa.
 *
 * ⚠️ A tentativa anterior devolveu ZERO, mas isso contradizia a evidência: ao
 * abrir "autitos baratitos" a página dizia "Grupo Público · 149,2 mil membros ·
 * Convidar · Compartilhar · **Entrou**". Ou seja, somos membros. A varredura é
 * que falhou, não a realidade.
 *
 * Causa provável: eu lia `a[href*="/groups/"]` do DOM, e o Facebook monta a
 * lista lateral depois, com rolagem — além de abrir um painel de notificações
 * que segura a página em esqueleto (já tinha mordido na sonda dos grupos).
 *
 * ★ Aqui eu tento TRÊS rotas e junto o resultado, em vez de apostar numa:
 *   1. /groups/joins  — a lista oficial de "seus grupos"
 *   2. /groups/feed   — a lateral do feed
 *   3. o próprio menu lateral da home de grupos
 *
 * E guardo o texto bruto da página quando não acha nada, para eu poder olhar o
 * que veio em vez de chutar de novo.
 */
const ROTAS = [
  ["joins", "https://www.facebook.com/groups/joins/"],
  ["feed", "https://www.facebook.com/groups/feed/"],
  ["discover", "https://www.facebook.com/groups/"],
];

/**
 * ⚠️ MESMA TRAVA da captação. Este script abre o MESMO `user-data-dir`, e duas
 * instâncias de Chrome no mesmo diretório brigam — foi a causa medida em
 * 07/10/2026 das mortes de sessão que andávamos culpando o Facebook.
 */
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
function tomarTrava(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ perfil ocupado (pid ${pid}). Saindo.`); return false; } } catch { /* órfã */ }
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

if (!tomarTrava()) process.exit(0);
const ctx = await abrirContexto();

const achados = new Map<string, string>();

for (const [rot, url] of ROTAS) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(2000);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 2200); await page.waitForTimeout(2200); }

    const daRota = await page.evaluate(() => {
      const out: [string, string][] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/groups/"]')) {
        const m = a.href.match(/facebook\.com\/groups\/([^/?#]+)/);
        if (!m) continue;
        const id = m[1];
        // ⚠️ Rotas da própria interface não são grupos.
        if (["joins", "feed", "discover", "create", "search", "browse"].includes(id)) continue;
        const nome = (a.innerText ?? "").replace(/\s+/g, " ").trim();
        if (nome.length > 2 && nome.length < 80) out.push([id, nome]);
      }
      return out;
    });

    for (const [id, nome] of daRota) if (!achados.has(id)) achados.set(id, nome);
    console.log(`  ${rot.padEnd(9)} → ${daRota.length} link(s), acumulado ${achados.size}`);

    if (!daRota.length) {
      const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 400));
      console.log(`     (vazio) a página dizia: ${txt.slice(0, 180)}`);
    }
  } catch (e) {
    console.log(`  ${rot.padEnd(9)} ✗ ${(e as Error).message.slice(0, 60)}`);
  } finally {
    await page.close().catch(() => {});
  }
}

const RX_CARRO = /(auto|carro|coche|vehicul|veicul|camioneta|motor|usados?|compra|venta|clasificad|4x4|camion|repuesto|chapa)/i;
console.log(`\n=== ${achados.size} GRUPOS ===`);
const lista = [...achados.entries()].sort((a, b) => Number(RX_CARRO.test(b[1])) - Number(RX_CARRO.test(a[1])));
for (const [id, nome] of lista) {
  console.log(`  ${RX_CARRO.test(nome) ? "★" : " "} ${nome.slice(0, 54).padEnd(54)} ${id}`);
}
fs.writeFileSync("C:/claude/grupos-do-perfil.json", JSON.stringify(lista, null, 1));
console.log(`\nsalvo em C:/claude/grupos-do-perfil.json`);
await fecharContexto().catch(() => {});
soltarTrava();
