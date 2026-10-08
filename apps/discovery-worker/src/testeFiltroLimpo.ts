import "dotenv/config";
import fs from "node:fs";
import { abrirContexto, fecharContexto } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook } from "./facebookMarketplaceService.js";
import { lerPrecoComContexto } from "./precoParaguai.js";
import { baixarLogado } from "./navegadorFacebook.js";

/**
 * O TESTE LIMPO: a faixa de preço vale, ou não?
 *
 * ★ Gustavo (08/10/2026): *"de prática de uso, a rolagem não 'cancela' os
 * filtros estabelecidos"*. Ele desconfiou da minha conclusão, e com razão —
 * minha evidência estava confusa e misturava duas perguntas.
 *
 * ⚠️ O ERRO PROVÁVEL É MEU E É DE SELETOR: eu colho
 * `a[href*="/marketplace/item/"]` do DOCUMENTO INTEIRO. A página do Marketplace
 * não tem só a grade de resultados — tem blocos de recomendação ("você também
 * pode gostar"), que não respeitam filtro nenhum. Somar os dois explicaria, de
 * uma vez, os ~500 ids independentes do filtro, os preços fora da faixa e a
 * sobreposição de 100% entre faixas diferentes.
 *
 * Então o teste separa as duas perguntas, e NÃO ROLA — rolagem é a segunda
 * pergunta, e misturá-la aqui foi o que me confundiu antes:
 *
 *   1. ESTRUTURA — quantos links de anúncio estão na GRADE e quantos fora dela?
 *   2. CONFORMIDADE — os da grade respeitam a faixa pedida?
 *
 * ⚠️ Nada de assumir o seletor da grade. O teste REPORTA os agrupamentos que
 * encontrou, com tamanho e posição, para eu olhar antes de decidir.
 */
const TRAVA = "C:/claude/fb-sessao-py.lock";
function tomar(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ perfil ocupado (pid ${pid})`); return false; } } catch { /* órfã */ }
  } catch { /* sem trava */ }
  fs.writeFileSync(TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}
const soltar = () => {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(TRAVA);
  } catch { /* já foi */ }
};
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MIN = 70_000_000, MAX = 90_000_000;
const URL =
  "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA&minYear=1990" +
  `&sortBy=creation_time_descend&minPrice=${MIN}&maxPrice=${MAX}`;

async function main() {
  if (!tomar()) return;
  const ctx = await abrirContexto(true);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.keyboard.press("Escape").catch(() => {});

  // ─── 1) ESTRUTURA ───
  const estrutura = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]')];
    // Para cada link, sobe até achar o ancestral que agrupa VÁRIOS links —
    // esse é o contêiner da grade (ou do bloco de recomendação).
    const grupos = new Map<Element, { n: number; primeiro: number; topo: number }>();
    anchors.forEach((a, i) => {
      let p: Element | null = a;
      for (let k = 0; k < 10 && p; k++) {
        const dentro = p.querySelectorAll('a[href*="/marketplace/item/"]').length;
        if (dentro >= 4) break;
        p = p.parentElement;
      }
      if (!p) return;
      const r = grupos.get(p) ?? { n: 0, primeiro: i, topo: Math.round(a.getBoundingClientRect().top + window.scrollY) };
      r.n++;
      grupos.set(p, r);
    });
    return {
      total: anchors.length,
      noMain: document.querySelector('[role="main"]')?.querySelectorAll('a[href*="/marketplace/item/"]').length ?? 0,
      grupos: [...grupos.entries()]
        .map(([el, r]) => ({ n: r.n, primeiro: r.primeiro, topo: r.topo, tag: el.tagName, classe: String(el.className).slice(0, 28) }))
        .sort((a, b) => b.n - a.n),
      // a ORDEM dos ids, para cruzar com o preço depois
      ids: anchors.map((a) => a.href.match(/\/marketplace\/item\/(\d+)/)?.[1]).filter(Boolean) as string[],
    };
  });

  console.log(`faixa pedida: ₲${(MIN / 1e6).toFixed(0)}M–${(MAX / 1e6).toFixed(0)}M · SEM rolagem\n`);
  console.log(`=== 1) ESTRUTURA: ${estrutura.total} links de anúncio no documento (${estrutura.noMain} dentro de [role="main"]) ===`);
  for (const g of estrutura.grupos.slice(0, 8)) {
    console.log(`  bloco com ${String(g.n).padStart(3)} link(s)  · 1º na posição ${String(g.primeiro).padStart(3)} · y=${String(g.topo).padStart(5)}px · ${g.tag}`);
  }
  await page.close().catch(() => {});

  // ─── 2) CONFORMIDADE ───
  const unicos = [...new Set(estrutura.ids)];
  const amostra = unicos.slice(0, 10);
  console.log(`\n=== 2) CONFORMIDADE: preço real dos ${amostra.length} PRIMEIROS (ordem do DOM) ===`);
  let dentro = 0, fora = 0, indef = 0;
  for (const [i, id] of amostra.entries()) {
    try {
      const html = await baixarLogado(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`, 1800);
      const a = extrairAnuncioFacebook(html, id, { exigirMotor: false })?.anuncio;
      const j = html.indexOf('"redacted_description"');
      const win = html.slice(Math.max(0, j - 9000), j + 9000);
      const txt = win.match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? "";
      const p = lerPrecoComContexto(txt, `${a?.titulo ?? ""} ${a?.descricao ?? ""}`);
      if (!p.ok) { indef++; console.log(`  ${String(i).padStart(2)} ${String(a?.titulo ?? "?").slice(0, 36).padEnd(36)} preço ilegível (${p.motivo})`); continue; }
      const ok = p.moeda === "PYG" && p.valor >= MIN && p.valor <= MAX;
      ok ? dentro++ : fora++;
      console.log(`  ${String(i).padStart(2)} ${String(a?.titulo ?? "?").slice(0, 36).padEnd(36)} ${p.moeda} ${p.valor.toLocaleString("es-PY").padStart(14)}  ${ok ? "✓ dentro" : "⚠️ fora"}`);
    } catch (e) { console.log(`  ${String(i).padStart(2)} ${id}: ✗ ${(e as Error).message.slice(0, 36)}`); }
    await dormir(2500);
  }

  console.log(`\n★ ${dentro} dentro · ${fora} fora · ${indef} ilegível`);
  console.log(
    dentro > fora
      ? "  ✓ O FILTRO VALE na primeira carga — o Gustavo está certo, e o problema\n    é o meu seletor pegando bloco de recomendação junto."
      : "  ⚠️ o filtro NÃO está valendo nem sem rolagem — aí o problema é outro.",
  );
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltar(); });
